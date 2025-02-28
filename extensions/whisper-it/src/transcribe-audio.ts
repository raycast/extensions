import { showHUD, Clipboard, LocalStorage } from "@raycast/api";
import { record, stopRecording } from "./recorder";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { Configuration, getConfig } from "./config";
import { TranscriptionEntry } from "./types";
const execAsync = promisify(exec);

async function saveTranscription(text: string, audioPath?: string): Promise<void> {
  const transcription: TranscriptionEntry = {
    id: Date.now().toString(),
    text,
    timestamp: Date.now(),
    audioFilePath: audioPath,
  };

  const existingTranscriptions = await LocalStorage.getItem<string>("transcriptions");
  const transcriptions: TranscriptionEntry[] = existingTranscriptions ? JSON.parse(existingTranscriptions) : [];

  transcriptions.unshift(transcription);
  await LocalStorage.setItem("transcriptions", JSON.stringify(transcriptions));
}

export default async function main() {
  try {
    if (await stopRecording()) {
      return;
    }

    // Load configuration
    const config = await getConfig();

    // Show recording status
    await showHUD("Recording...");

    // Create a temporary WAV file in the configured location
    const recordingPath = await record();

    // Show transcribing status
    await showHUD("Transcribing...");

    const date = new Date();

    // Transcribe the audio
    await transcribeAudio(recordingPath, config)
      .then(async (transcription) => {
        // Save transcription before copying/pasting
        await saveTranscription(transcription, config.keepAudioFiles ? recordingPath : undefined);

        if (config.pasteTranscription) {
          await Clipboard.paste(transcription);
        } else {
          await Clipboard.copy(transcription);
        }
      })
      .finally(() => {
        if (!config.keepAudioFiles && fs.existsSync(recordingPath)) {
          fs.unlinkSync(recordingPath);
        }
      });

    // Show success message
    const action = config.pasteTranscription ? "pasted" : "copied";
    await showHUD(`Transcription ${action} after ${new Date().getTime() - date.getTime()}ms`);
  } catch (error) {
    console.error(error);
    await showHUD("Error: " + (error instanceof Error ? error.message : "Failed to transcribe"));
  }
}

const pythonScript = `
from faster_whisper import WhisperModel
import json
import sys

model_size = sys.argv[2] if len(sys.argv) > 2 else "small.en"
model = WhisperModel(model_size, device="cpu", compute_type="float32")

file_path = sys.argv[1]
if not file_path:
    print("No file path provided")
    sys.exit(1)

segments, info = model.transcribe(file_path, beam_size=5)

print(json.dumps({ "language": info.language, "text": [segment.text for segment in segments] }))
`;

fs.writeFileSync(__dirname + "/transcribe.py", pythonScript, "utf-8");

async function transcribeAudio(filePath: string, config: Configuration): Promise<string> {
  try {
    const { stdout } = await execAsync(`${config.pythonPath} ${__dirname}/transcribe.py ${filePath} ${config.model}`);
    // Extract just the transcribed text without timestamps
    const result = JSON.parse(stdout);
    return result.text.join("\n").trim();
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}
