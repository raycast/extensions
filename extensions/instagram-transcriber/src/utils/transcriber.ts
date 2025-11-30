import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { downloadVideo } from "./instagram";
import { transcribeWithWhisper } from "./whisper";

const execAsync = promisify(exec);

interface TranscribeOptions {
  preferOnDevice: boolean;
  whisperApiKey?: string;
}

/**
 * Main transcription function that routes to appropriate method
 */
export async function transcribeVideo(
  url: string,
  options: TranscribeOptions,
): Promise<string> {
  // Create temp directory for processing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ig-transcribe-"));

  try {
    // Download video
    const videoPath = await downloadVideo(url, tempDir);

    // Try on-device transcription first if preferred
    if (options.preferOnDevice) {
      try {
        return await transcribeOnDevice(videoPath);
      } catch (error) {
        console.log(
          "On-device transcription failed, falling back to Whisper API",
        );
        if (!options.whisperApiKey) {
          throw new Error(
            "On-device transcription failed and no Whisper API key provided",
          );
        }
      }
    }

    // Use Whisper API
    if (!options.whisperApiKey) {
      throw new Error("Whisper API key required for cloud transcription");
    }

    return await transcribeWithWhisper(videoPath, options.whisperApiKey);
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Transcribe using macOS on-device Speech framework
 */
async function transcribeOnDevice(videoPath: string): Promise<string> {
  // First, extract audio from video using ffmpeg
  const audioPath = videoPath.replace(/\.[^.]+$/, ".wav");

  // Check if ffmpeg is installed
  try {
    await execAsync("which ffmpeg");
  } catch {
    throw new Error(
      "ffmpeg not found. Please install it via Homebrew: brew install ffmpeg",
    );
  }

  // Extract audio as WAV
  await execAsync(
    `ffmpeg -i "${videoPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`,
  );

  // Create Swift script for on-device transcription
  const swiftScript = `
import Speech
import AVFoundation
import Foundation

class Transcriber {
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechURLRecognitionRequest?
    
    func transcribe(audioURL: URL) async throws -> String {
        guard let recognizer = recognizer, recognizer.isAvailable else {
            throw NSError(domain: "TranscriptionError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Speech recognition not available"])
        }
        
        // Request authorization
        let authStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
        
        guard authStatus == .authorized else {
            throw NSError(domain: "TranscriptionError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Speech recognition not authorized"])
        }
        
        // Create recognition request
        let request = SFSpeechURLRecognitionRequest(url: audioURL)
        request.shouldReportPartialResults = false
        request.requiresOnDeviceRecognition = true
        
        // Perform recognition
        return try await withCheckedThrowingContinuation { continuation in
            recognizer.recognitionTask(with: request) { result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                if let result = result, result.isFinal {
                    continuation.resume(returning: result.bestTranscription.formattedString)
                }
            }
        }
    }
}

// Main execution
let audioPath = CommandLine.arguments[1]
let audioURL = URL(fileURLWithPath: audioPath)

Task {
    do {
        let transcriber = Transcriber()
        let transcript = try await transcriber.transcribe(audioURL: audioURL)
        print(transcript)
        exit(0)
    } catch {
        print("Error: \\(error.localizedDescription)", to: &standardError)
        exit(1)
    }
}

RunLoop.main.run()
`;

  // Write Swift script to temp file
  const scriptPath = audioPath.replace(/\.wav$/, ".swift");
  await fs.writeFile(scriptPath, swiftScript);

  // Execute Swift script
  try {
    const { stdout } = await execAsync(`swift "${scriptPath}" "${audioPath}"`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for long transcripts
    });
    return stdout.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`On-device transcription failed: ${errorMessage}`);
  }
}
