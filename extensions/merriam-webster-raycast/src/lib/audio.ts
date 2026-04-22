import { environment } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { join } from "path";

const execFile = promisify(execFileCb);

const NUMBER_PREFIX = /^[0-9]/;

export function audioSubdirectory(audioId: string) {
  if (audioId.startsWith("bix")) return "bix";
  if (audioId.startsWith("gg")) return "gg";
  if (NUMBER_PREFIX.test(audioId)) return "number";
  return audioId[0];
}

export async function playAudioUrl(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      await showToast({ style: Toast.Style.Failure, title: "Could not download audio" });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = join(environment.supportPath, "pronunciation.mp3");
    await writeFile(filePath, buffer);
    await execFile("afplay", [filePath]);
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Audio playback failed", message: String(err) });
  }
}
