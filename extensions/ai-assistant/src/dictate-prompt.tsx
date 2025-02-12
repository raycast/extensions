import { showHUD, getPreferenceValues, Clipboard, LocalStorage } from "@raycast/api";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { cleanText, getLLMModel, getSelectedText, replaceSelectedText } from "./utils/common";
import {
  SILENCE_TIMEOUT_KEY,
  MUTE_DURING_DICTATION_KEY,
  EXPERIMENTAL_SINGLE_CALL_KEY,
  USE_PERSONAL_DICTIONARY_KEY,
  FIX_TEXT_KEY,
} from "./settings";
import { setSystemAudioMute, isSystemAudioMuted } from "./utils/audio";
import { measureTime } from "./utils/timing";
import { startPeriodicNotification, stopPeriodicNotification } from "./utils/timing";
import { addTranscriptionToHistory, getRecordingsToKeep } from "./utils/transcription-history";
import { getActiveApplication } from "./utils/active-app";
import { getPersonalDictionaryPrompt } from "./utils/dictionary";

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
 * Clean up old recording files (older than 1 hour)
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

/**
 * Execute the prompt using OpenAI
 * @param prompt The prompt to execute
 * @param selectedText Optional selected text to include in the prompt
 * @param openai OpenAI instance
 * @param usePersonalDictionary Whether to use the personal dictionary
 * @param fixText Whether to fix text grammar and spelling
 * @returns Promise<string> The generated text
 */
async function executePrompt(
  prompt: string,
  selectedText: string | null,
  openai: OpenAI,
  usePersonalDictionary: boolean,
  fixText: boolean,
): Promise<string> {
  console.log("Executing prompt with:", { prompt, hasSelectedText: !!selectedText });

  const dictionaryPrompt = usePersonalDictionary ? await getPersonalDictionaryPrompt() : "";

  const systemPrompt = selectedText
    ? "You are an AI assistant that helps users modify text based on voice commands. Apply the user's prompt to modify the text. Respond ONLY with the modified text, without any explanations or context."
    : "You are an AI assistant that helps users generate text based on voice commands. Respond ONLY with the generated text, without any explanations or context.";

  const userPrompt = selectedText
    ? `Please modify the following text according to this instruction: "${prompt}"${
        dictionaryPrompt ? "\n\nPlease also apply these dictionary rules:\n" + dictionaryPrompt : ""
      }${fixText ? "\n\nPlease fix any grammar or spelling issues while keeping the same language." : ""}\n\nText to modify: "${selectedText}"`
    : `${prompt}${dictionaryPrompt ? "\n\nPlease apply these dictionary rules:\n" + dictionaryPrompt : ""}${
        fixText ? "\n\nPlease fix any grammar or spelling issues while keeping the same language." : ""
      }`;

  console.log("Sending to OpenAI:", {
    model: getLLMModel(),
    systemPrompt,
    userPrompt,
  });

  const completion = await openai.chat.completions.create({
    model: getLLMModel(),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.7,
  });

  const result = completion.choices[0].message.content?.trim() || "";
  console.log("OpenAI response:", { length: result.length, preview: result.substring(0, 100) });

  return result;
}

/**
 * Clean and process the transcribed prompt to extract the actual command
 * @param transcription The raw transcription from Whisper
 * @returns The cleaned prompt or null if it's just a request for text
 */

export default async function Command() {
  console.log("🎙️ Starting dictate-prompt command...");

  let originalMuteState = false;
  let muteDuringDictation = false;

  try {
    const preferences = getPreferenceValues<Preferences>();

    // Load settings from local storage
    const savedFixText = await LocalStorage.getItem<string>(FIX_TEXT_KEY);
    preferences.fixText = savedFixText === "true";

    const savedExperimentalSingleCall = await LocalStorage.getItem<string>(EXPERIMENTAL_SINGLE_CALL_KEY);
    const experimentalSingleCall = savedExperimentalSingleCall === "true";

    const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
    const usePersonalDictionary = savedUsePersonalDictionary === "true";

    const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);
    muteDuringDictation = savedMuteDuringDictation === "true";

    const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
    const silenceTimeout = savedSilenceTimeout || "2.0";

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: preferences.openaiApiKey,
    });

    // Get selected text if any
    let selectedText: string | null = null;
    try {
      selectedText = await getSelectedText();
      if (selectedText) {
        console.log("Found selected text:", selectedText);
      } else {
        console.log("No text currently selected");
      }
    } catch (error) {
      // This is a normal case when there's just a cursor position without selection
      console.log("No text selected, will generate new text");
    }

    // Prepare recordings directory
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    // Clean up old recordings that are not in history
    const recordingsToKeep = await getRecordingsToKeep();
    await cleanupOldRecordings(RECORDINGS_DIR, recordingsToKeep);

    const outputPath = path.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);
    console.log("Recording will be saved to:", outputPath);

    // Handle audio muting if enabled
    if (muteDuringDictation) {
      originalMuteState = await isSystemAudioMuted();
      await setSystemAudioMute(true);
    }

    // Start recording
    await showHUD(`🎙️ Recording... (will stop after ${silenceTimeout}s of silence)`);
    console.log("Starting recording...");

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

    if (experimentalSingleCall) {
      transcription = await measureTime("GPT-4o-audio-preview transcription", async () => {
        const audioBuffer = fs.readFileSync(outputPath);
        const base64Audio = audioBuffer.toString("base64");

        const dictionaryPrompt = usePersonalDictionary ? await getPersonalDictionaryPrompt() : "";
        const contextPrompt = selectedText
          ? `Process this audio as a command to modify the following text: "${selectedText}". ${
              preferences.fixText ? "Fix any grammar or spelling issues while keeping the same language." : ""
            }${dictionaryPrompt ? "\n\n" + dictionaryPrompt : ""}`
          : `Process this audio as a command to generate text. ${
              preferences.fixText ? "Fix any grammar or spelling issues while keeping the same language." : ""
            }${dictionaryPrompt ? "\n\n" + dictionaryPrompt : ""}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-audio-preview",
          modalities: ["text"],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: contextPrompt,
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
        });
      });
    }

    stopPeriodicNotification();

    // Clean up the transcription if needed
    let prompt = transcription.text;
    if (preferences.fixText && !experimentalSingleCall) {
      await showHUD("✍️ Improving prompt...");
      startPeriodicNotification("✍️ Improving prompt");
      prompt = await measureTime("Text improvement", async () => {
        return await cleanText(prompt, openai);
      });
      stopPeriodicNotification();
    }

    // Add to history
    await addTranscriptionToHistory(prompt, "prompt", outputPath, {
      mode: experimentalSingleCall ? "gpt4" : "online",
      textCorrectionEnabled: preferences.fixText,
      targetLanguage: "prompt",
      activeApp: await getActiveApplication(),
    });

    // Execute the prompt
    await showHUD("🤖 Processing your request...");
    startPeriodicNotification("🤖 Processing your request");

    const generatedText = await measureTime("Prompt execution", async () => {
      return await executePrompt(prompt, selectedText, openai, usePersonalDictionary, preferences.fixText);
    });

    stopPeriodicNotification();

    // Replace selected text or paste at cursor position
    if (selectedText) {
      await replaceSelectedText(generatedText);
      await showHUD("✅ Text replaced!");
    } else {
      await Clipboard.paste(generatedText);
      await showHUD("✅ Text generated and pasted!");
    }

    console.log("✨ Operation completed successfully");
  } catch (error) {
    console.error("❌ Error:", error);
    await showHUD("❌ Error: " + (error instanceof Error ? error.message : "An error occurred"));
    stopPeriodicNotification();

    // Restore original audio state in case of error
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }
  } finally {
    // Final cleanup
    try {
      await execAsync("pkill sox");
    } catch (error) {
      // Ignore pkill errors
    }
  }
}
