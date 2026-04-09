import { execFile } from "child_process";

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
    execFile(
      "curl",
      ["-sL", speechUrl, "-o", "/tmp/polidict-speech.mp3"],
      { timeout: 30_000 },
      (error) => {
        if (error) {
          console.error("Failed to download speech audio:", error.message);
          return;
        }
        execFile(
          "afplay",
          ["/tmp/polidict-speech.mp3"],
          { timeout: 30_000 },
          (playError) => {
            if (playError) {
              console.error("Failed to play audio:", playError.message);
            }
          },
        );
      },
    );
  } else {
    execFile("say", [text], { timeout: 30_000 }, (error) => {
      if (error) {
        console.error("Failed to speak text:", error.message);
      }
    });
  }
}
