import { showHUD, getPreferenceValues, LocalStorage, Clipboard } from "@raycast/api";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { DICTATE_TARGET_LANG_KEY, WHISPER_MODE_KEY, WHISPER_MODEL_KEY, EXPERIMENTAL_SINGLE_CALL_KEY } from "./settings";
import { cleanText, getLLMModel } from "./utils/common";
import { isWhisperInstalled, isModelDownloaded, transcribeAudio } from "./utils/whisper-local";

const execAsync = promisify(exec);
const SOX_PATH = "/opt/homebrew/bin/sox";

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  fixText: boolean;
}

/**
 * Clean up old recording files (older than 1 hour)
 * @param tempDir Directory containing the recordings
 */
async function cleanupOldRecordings(tempDir: string) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < oneHourAgo && file.startsWith("recording-") && file.endsWith(".wav")) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old recording: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old recordings:", error);
  }
}

export default async function Command() {
  console.log("Starting dictation command...");

  // Vérifier que sox est installé
  if (!fs.existsSync(SOX_PATH)) {
    console.error(`Sox not found at path: ${SOX_PATH}`);
    await showHUD("🎙️ Sox not found - Please install it with: brew install sox");
    return;
  }

  try {
    const preferences = getPreferenceValues<Preferences>();
    const targetLanguage = (await LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY)) || "auto";
    const whisperMode = (await LocalStorage.getItem<string>(WHISPER_MODE_KEY)) || "online";
    const whisperModel = (await LocalStorage.getItem<string>(WHISPER_MODEL_KEY)) || "base";
    const experimentalSingleCall = (await LocalStorage.getItem<string>(EXPERIMENTAL_SINGLE_CALL_KEY)) === "true";
    console.log("Target language:", targetLanguage);
    console.log("Whisper mode:", whisperMode);
    console.log("Whisper model:", whisperModel);
    console.log("Experimental single call mode:", experimentalSingleCall);

    // Vérifier si Whisper local est disponible si nécessaire
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

    // Préparer le fichier temporaire
    const tempDir = path.join(process.env.TMPDIR || "/tmp", "raycast-dictate");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Clean up old recordings
    await cleanupOldRecordings(tempDir);

    const outputPath = path.join(tempDir, `recording-${Date.now()}.wav`);
    console.log("Recording will be saved to:", outputPath);

    // Démarrer l'enregistrement
    await showHUD("🎙️ Recording... (will stop after 2s of silence)");
    console.log("Starting recording...");

    const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d "${outputPath}" silence 1 0.1 2% 1 2.0 2%
    `;

    await execAsync(command, { shell: "/bin/zsh" });
    console.log("Recording completed");

    // Traiter l'audio
    await showHUD("🔄 Converting speech to text...");
    console.log("Processing audio file:", outputPath);

    let transcription;
    if (whisperMode === "local") {
      console.log("Transcribe using: Local Whisper");
      const text = await transcribeAudio(
        outputPath,
        whisperModel,
        targetLanguage === "auto" ? undefined : targetLanguage,
      );
      transcription = { text };
    } else {
      if (experimentalSingleCall) {
        console.log("Transcribe using: OpenAI GPT-4o-audio-preview");
        // Lire le fichier audio en base64
        const audioBuffer = fs.readFileSync(outputPath);
        const base64Audio = audioBuffer.toString("base64");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-audio-preview",
          modalities: ["text"],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Transcribe this audio${targetLanguage === "auto" ? " in the same language as the audio input" : ` in ${targetLanguage}`}. ${preferences.fixText ? "Fix any grammar or spelling issues while keeping the same language." : ""}`,
                },
                { type: "input_audio", input_audio: { data: base64Audio, format: "wav" } },
              ],
            },
          ],
        });

        const result = completion.choices[0]?.message?.content;
        if (typeof result === "string") {
          transcription = { text: result };
        } else {
          throw new Error("Unexpected response format from GPT-4o-audio-preview");
        }
      } else {
        console.log("Transcribe using: OpenAI Whisper");
        transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: "whisper-1",
          language: targetLanguage === "auto" ? undefined : targetLanguage,
        });
      }
    }

    // Clean up the transcription if needed
    let finalText = transcription.text;
    if (preferences.fixText && !experimentalSingleCall) {
      await showHUD("✍️ Improving text...");
      finalText = await cleanText(finalText, openai);
    }

    // Nettoyer le fichier temporaire
    fs.unlinkSync(outputPath);
    console.log("Temporary file cleaned up");

    // Traduire si nécessaire
    if (targetLanguage !== "auto" && !experimentalSingleCall) {
      await showHUD(`🌐 Translating to ${targetLanguage}...`);
      console.log("Translating to:", targetLanguage);

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

      const translatedText = completion.choices[0].message.content || "";
      if (translatedText) {
        await Clipboard.paste(translatedText);
        await showHUD("✅ Translation completed and pasted!");
        console.log("Translation pasted:", translatedText);
      }
    } else {
      await Clipboard.paste(finalText);
      await showHUD("✅ Transcription completed and pasted!");
      console.log("Transcription pasted:", finalText);
    }
  } catch (error) {
    console.error("Error:", error);
    await showHUD("❌ Error: " + (error instanceof Error ? error.message : "An error occurred"));
  } finally {
    // Nettoyage final
    try {
      await execAsync("pkill sox");
    } catch (error) {
      // Ignore pkill errors
    }
  }
}
