import { execFile } from "child_process";
import { randomUUID } from "crypto";

export function playSpeech(text: string, speechUrl?: string): void {
  if (speechUrl) {
    try {
      const url = new URL(speechUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        return;
      }
    } catch {
      return;
    }
    const tmpFile = `/tmp/polidict-speech-${randomUUID()}.mp3`;
    execFile("curl", ["-sL", speechUrl, "-o", tmpFile], { timeout: 30_000 }, (error) => {
      if (error) {
        console.error("Failed to download speech audio:", error.message);
        return;
      }
      execFile("afplay", [tmpFile], { timeout: 30_000 }, (playError) => {
        if (playError) {
          console.error("Failed to play audio:", playError.message);
        }
      });
    });
  } else {
    execFile("say", [text], { timeout: 30_000 }, (error) => {
      if (error) {
        console.error("Failed to speak text:", error.message);
      }
    });
  }
}
