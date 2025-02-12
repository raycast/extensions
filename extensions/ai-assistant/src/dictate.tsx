import { showHUD, getPreferenceValues, LocalStorage, Clipboard } from "@raycast/api";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  DICTATE_TARGET_LANG_KEY,
  WHISPER_MODE_KEY,
  WHISPER_MODEL_KEY,
  EXPERIMENTAL_SINGLE_CALL_KEY,
  SILENCE_TIMEOUT_KEY,
  USE_PERSONAL_DICTIONARY_KEY,
  MUTE_DURING_DICTATION_KEY,
  FIX_TEXT_KEY,
} from "./settings";
import { cleanText, getLLMModel } from "./utils/common";
import { isWhisperInstalled, isModelDownloaded, transcribeAudio } from "./utils/whisper-local";
import { getPersonalDictionaryPrompt } from "./utils/dictionary";
import { setSystemAudioMute, isSystemAudioMuted } from "./utils/audio";
import { measureTime } from "./utils/timing";
import { startPeriodicNotification, stopPeriodicNotification } from "./utils/timing";
import { addTranscriptionToHistory, getRecordingsToKeep } from "./utils/transcription-history";
import { getActiveApplication } from "./utils/active-app";

const execAsync = promisify(exec);
const SOX_PATH = "/opt/homebrew/bin/sox";
const RECORDINGS_DIR = path.join(__dirname, "recordings");

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  fixText: boolean;
}

interface Transcription {
  text: string;
}

/**
 * Clean up old recording files that are not in history and older than 1 hour
 * @param tempDir Directory containing the recordings
 * @param recordingsToKeep Set of recording paths to keep
 */
async function cleanupOldRecordings(tempDir: string, recordingsToKeep: Set<string>) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (
        stats.mtimeMs < oneHourAgo &&
        file.startsWith("recording-") &&
        file.endsWith(".wav") &&
        !recordingsToKeep.has(filePath)
      ) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old recording: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old recordings:", error);
  }
}

export default async function Command() {
  console.log("🎙️ Starting dictation...");

  let originalMuteState = false;
  let muteDuringDictation = false;

  try {
    const preferences = getPreferenceValues<Preferences>();

    // Load settings from local storage
    const savedFixText = await LocalStorage.getItem<string>(FIX_TEXT_KEY);
    preferences.fixText = savedFixText === "true";

    const savedTargetLang = await LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY);
    const targetLanguage = savedTargetLang || "auto";

    const savedWhisperMode = await LocalStorage.getItem<string>(WHISPER_MODE_KEY);
    const whisperMode = savedWhisperMode || "online";

    const savedWhisperModel = await LocalStorage.getItem<string>(WHISPER_MODEL_KEY);
    const whisperModel = savedWhisperModel || "base";

    const savedExperimentalSingleCall = await LocalStorage.getItem<string>(EXPERIMENTAL_SINGLE_CALL_KEY);
    const experimentalSingleCall = savedExperimentalSingleCall === "true";

    const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
    const silenceTimeout = savedSilenceTimeout || "2.0";

    const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
    const usePersonalDictionary = savedUsePersonalDictionary === "true";

    const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);
    muteDuringDictation = savedMuteDuringDictation === "true";

    console.log("⚙️ Configuration:", {
      mode: whisperMode,
      model: whisperMode === "local" ? whisperModel : experimentalSingleCall ? "gpt-4o-audio-preview" : "whisper-1",
      targetLanguage,
      fixText: preferences.fixText,
      usePersonalDictionary,
    });

    // Check if local Whisper is available if needed
    if (whisperMode === "local") {
      const isWhisperReady = await isWhisperInstalled();
      if (!isWhisperReady) {
        await showHUD("❌ Whisper is not installed - Please install it from the Whisper Models menu");
        return;
      }

      if (!isModelDownloaded(whisperModel)) {
        await showHUD(`❌ Model ${whisperModel} is not downloaded - Please download it from the Whisper Models menu`);
        return;
      }
    }

    const openai = new OpenAI({
      apiKey: preferences.openaiApiKey,
    });

    // Prepare temporary file
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    // Clean up old recordings that are not in history
    const recordingsToKeep = await getRecordingsToKeep();
    await cleanupOldRecordings(RECORDINGS_DIR, recordingsToKeep);

    const outputPath = path.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);

    // Handle audio muting if enabled
    if (muteDuringDictation) {
      originalMuteState = await isSystemAudioMuted();
      await setSystemAudioMute(true);
    }

    // Start recording
    await showHUD(`🎙️ Recording... (will stop after ${silenceTimeout}s of silence)`);

    const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d "${outputPath}" silence 1 0.1 0% 1 ${silenceTimeout} 2%
    `;

    await execAsync(command, { shell: "/bin/zsh" });
    console.log("✅ Recording completed");

    // Restore original audio state if needed
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }

    // Process audio
    await showHUD("🔄 Converting speech to text...");
    startPeriodicNotification("🔄 Converting speech to text");

    let transcription: Transcription;

    if (whisperMode === "local") {
      transcription = await measureTime("Local Whisper transcription", async () => {
        const text = await transcribeAudio(
          outputPath,
          whisperModel,
          targetLanguage === "auto" ? undefined : targetLanguage,
        );
        return { text };
      });
    } else {
      if (experimentalSingleCall) {
        transcription = await measureTime("GPT-4o-audio-preview transcription", async () => {
          const audioBuffer = fs.readFileSync(outputPath);
          const base64Audio = audioBuffer.toString("base64");

          const dictionaryPrompt = usePersonalDictionary ? await getPersonalDictionaryPrompt() : "";

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-audio-preview",
            modalities: ["text"],
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Transcribe this audio${
                      targetLanguage === "auto" ? " in the same language as the audio input" : ` in ${targetLanguage}`
                    }. ${preferences.fixText ? "Fix any grammar or spelling issues while keeping the same language." : ""}${
                      dictionaryPrompt ? "\n\n" + dictionaryPrompt : ""
                    }`,
                  },
                  { type: "input_audio", input_audio: { data: base64Audio, format: "wav" } },
                ],
              },
            ],
          });

          const result = completion.choices[0]?.message?.content;
          if (typeof result === "string") {
            return { text: result };
          } else {
            throw new Error("Unexpected response format from GPT-4o-audio-preview");
          }
        });
      } else {
        transcription = await measureTime("OpenAI Whisper transcription", async () => {
          return await openai.audio.transcriptions.create({
            file: fs.createReadStream(outputPath),
            model: "whisper-1",
            language: targetLanguage === "auto" ? undefined : targetLanguage,
          });
        });
      }
    }

    // Apply personal dictionary corrections if enabled, regardless of transcription mode
    if (usePersonalDictionary && !experimentalSingleCall) {
      transcription = await measureTime("Personal dictionary corrections", async () => {
        const dictionaryPrompt = await getPersonalDictionaryPrompt();
        if (dictionaryPrompt) {
          const completion = await openai.chat.completions.create({
            model: getLLMModel(),
            messages: [
              {
                role: "system",
                content:
                  "You are a text correction assistant. Your task is to apply personal dictionary corrections to the transcribed text while preserving the original meaning and formatting.",
              },
              {
                role: "user",
                content: `Please correct this transcribed text according to the personal dictionary:\n\n${dictionaryPrompt}\n\nText to correct:\n"${transcription.text}"\n\nRespond ONLY with the corrected text.`,
              },
            ],
            temperature: 0.3,
          });

          return { text: completion.choices[0].message.content?.trim() || transcription.text };
        }
        return transcription;
      });
    }

    stopPeriodicNotification();

    // Clean up the transcription if needed
    let finalText = transcription.text;
    if (preferences.fixText && !experimentalSingleCall) {
      await showHUD("✍️ Improving text...");
      startPeriodicNotification("✍️ Improving text");
      finalText = await measureTime("Text improvement", async () => {
        return await cleanText(finalText, openai);
      });
      stopPeriodicNotification();
    }

    // Add to history
    await addTranscriptionToHistory(finalText, targetLanguage, outputPath, {
      mode: experimentalSingleCall ? "gpt4" : whisperMode === "local" ? "local" : "online",
      model: whisperMode === "local" ? whisperModel : undefined,
      textCorrectionEnabled: preferences.fixText,
      targetLanguage,
      activeApp: await getActiveApplication(),
    });

    // Translate if needed
    if (targetLanguage !== "auto" && !experimentalSingleCall) {
      await showHUD(`🌐 Translating to ${targetLanguage}...`);
      startPeriodicNotification(`Translating to ${targetLanguage}`);

      finalText = await measureTime("Translation", async () => {
        const completion = await openai.chat.completions.create({
          model: getLLMModel(),
          messages: [
            {
              role: "system",
              content: `You are a translator. Translate the following text to the specified language: ${targetLanguage}. Keep the tone and style of the original text.`,
            },
            {
              role: "user",
              content: finalText,
            },
          ],
          temperature: 0.3,
        });

        return completion.choices[0].message.content || finalText;
      });

      stopPeriodicNotification();
    }

    await Clipboard.paste(finalText);
    await showHUD("✅ Transcription completed and pasted!");
    console.log("✨ Final result:", finalText);
  } catch (error) {
    console.error("❌ Error during dictation:", error);
    await showHUD("❌ Error during dictation");
    stopPeriodicNotification();

    // Restore original audio state in case of error
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }
  }
}
