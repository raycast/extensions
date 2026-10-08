import { exec, ExecException, ChildProcess } from "child_process";
import fs from "fs";
import https from "https";
import path from "path";
import os from "os";
import { showToast } from "@raycast/api";

// Maintain a reference to the current audio process
let currentAudioProcess: ChildProcess | null = null;

export function playRemoteAudio(url: string) {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, "temp_audio.wav");

  // Stop the current audio process if it exists
  if (currentAudioProcess) {
    currentAudioProcess.kill();
    showToast({ title: "Audio playback stopped" });
    return;
  }

  if (!url.includes("https")) {
    showToast({ title: "File still downloading... Please try again" });
    return;
  }

  https
    .get(url, (response) => {
      const fileStream = fs.createWriteStream(tempFile);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        console.log("Download completed");
        showToast({ title: "Playing audio from the Rabbit Hole" });

        // Play the downloaded file
        currentAudioProcess = exec(`afplay "${tempFile}"`, (error: ExecException | null) => {
          if (error) {
            console.error(`Error playing audio: ${error}`);
          }
          // Delete the temporary file after playing
          fs.unlink(tempFile, (err) => {
            if (err) console.error(`Error deleting temporary file: ${err}`);
          });
          // Clear the reference to the process after it finishes
          currentAudioProcess = null;
        });
      });
    })
    .on("error", (err) => {
      console.error(`Error downloading file: ${err}`);
    });
}

export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  return date.toLocaleString("en-US", options);
}

export function timeAgo(timestamp: Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const secondsPast = (now.getTime() - date.getTime()) / 1000;

  if (secondsPast < 60) {
    return `${Math.floor(secondsPast)}secs ago`;
  }

  const minutesPast = secondsPast / 60;
  if (minutesPast < 60) {
    return `${Math.floor(minutesPast)}mins ago`;
  }

  const hoursPast = minutesPast / 60;
  if (hoursPast < 24) {
    return `${Math.floor(hoursPast)}h ago`;
  }

  const daysPast = hoursPast / 24;
  if (daysPast < 7) {
    return `${Math.floor(daysPast)}d ago`;
  }

  const weeksPast = daysPast / 7;
  if (weeksPast < 4.3) {
    return `${Math.floor(weeksPast)}w ago`;
  }

  const monthsPast = daysPast / 30;
  if (monthsPast < 12) {
    return `${Math.floor(monthsPast)}mo ago`;
  }

  const yearsPast = monthsPast / 12;
  return `${Math.floor(yearsPast)}y ago`;
}
