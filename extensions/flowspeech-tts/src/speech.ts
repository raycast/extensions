import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { generateSpeech } from "./api";
import { toWav } from "./audio";

const execFileAsync = promisify(execFile);
const MAX_TEXT_LENGTH = 10_000;

interface Preferences {
  apiKey: string;
  voiceName: string;
}

export async function speakText(getText: () => Promise<string | undefined>): Promise<void> {
  let audioPath: string | undefined;

  try {
    const text = (await getText())?.trim();
    if (!text) {
      throw new Error("Select or copy some text first");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Text is too long. Use ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer`);
    }

    await showToast({ style: Toast.Style.Animated, title: "Generating speech..." });

    const preferences = getPreferenceValues<Preferences>();
    const generatedAudio = await generateSpeech(text, preferences.voiceName, preferences.apiKey);
    const wav = toWav(generatedAudio);

    await mkdir(environment.supportPath, { recursive: true });
    audioPath = path.join(environment.supportPath, `flowspeech-${Date.now()}.wav`);
    await writeFile(audioPath, wav);

    await showToast({ style: Toast.Style.Success, title: "Playing with FlowSpeech" });
    await execFileAsync("/usr/bin/afplay", [audioPath]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Could not play speech", message });
  } finally {
    if (audioPath) {
      await unlink(audioPath).catch(() => undefined);
    }
  }
}
