import { getSelectedText, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { OpenAI } from "openai";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import os from "os";
import util from "util";

const execAsync = util.promisify(exec);

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface Preferences {
  apiKey: string;
  defaultVoice: Voice;
}

class TextToSpeechProcessor {
  private textToSpeechQueue: string[] = [];
  private playAudioQueue: string[] = [];
  private isPlaying = false;
  private isConverting = false;
  private openai: OpenAI;
  private voice: Voice;

  constructor(apiKey: string, voice: Voice) {
    this.openai = new OpenAI({ apiKey });
    this.voice = voice;
  }

  public async processSelectedText() {
    try {
      const selectedText = await getSelectedText();
      this.textToSpeechQueue = selectedText.split(/(?<=\.)\s|\n/).map((s) => (s.endsWith(".") ? s + " " : s));
      if (!this.isConverting) {
        await this.convertTextToSpeech();
      }
      await this.waitForQueuesToEmpty();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot speak selected text",
        message: String(error),
      });
    }
  }

  private async waitForQueuesToEmpty() {
    while (this.textToSpeechQueue.length > 0 || this.playAudioQueue.length > 0 || this.isConverting || this.isPlaying) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async convertTextToSpeech() {
    this.isConverting = true;

    for (const textPart of this.textToSpeechQueue) {
      const speechFile = path.resolve(os.tmpdir(), `speech_${Date.now()}.mp3`);
      try {
        const mp3 = await this.openai.audio.speech.create({
          model: "tts-1",
          voice: this.voice,
          input: textPart,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        await fs.writeFile(speechFile, buffer);
        this.playAudioQueue.push(speechFile);
      } catch (error) {
        console.error("Error converting text to speech:", error);
      }

      if (!this.isPlaying) {
        this.playAudio();
      }
    }

    this.textToSpeechQueue = [];
    this.isConverting = false;
  }

  private async playAudio() {
    while (this.playAudioQueue.length > 0) {
      await closeMainWindow({ clearRootSearch: true });
      this.isPlaying = true;
      const speechFile = this.playAudioQueue.shift()!;
      try {
        console.log("Playing audio:", speechFile);
        await execAsync(`afplay ${speechFile}`);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error playing audio",
          message: String(error),
        });
      } finally {
        await fs.unlink(speechFile).catch((err) => console.error(`Error deleting file: ${speechFile}`, err));
      }
    }

    this.isPlaying = false;
    if (!this.isConverting) {
      await closeMainWindow({ clearRootSearch: true });
    }
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const processor = new TextToSpeechProcessor(preferences.apiKey, preferences.defaultVoice);
  await processor.processSelectedText();
}
