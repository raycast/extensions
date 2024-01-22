import { getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { OpenAI } from "openai";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { LanguageCode, ScriptStyle, Voice, Preferences } from "./types";
import { MIN_TEXT_QUE_SENTENCE_LENGTH, SCRIPT_STYLES_PROMPTS } from "./const";
import {
  cleanupTmpDir,
  execAsync,
  getCurrentCommandIdentifier,
  setCurrentCommandIdentifier,
  splitSentences,
} from "./utills";

class TextToSpeechProcessor {
  private textToSpeechQueue: string[] = [];
  private playAudioQueue: { filePath: string; text: string }[] = [];
  private isPlaying = false;
  private isConverting = false;
  private openai: OpenAI;
  private voice: Voice;
  private temperature: number;
  private gptModel: string;
  private subtitlesToggle: boolean;
  private outputLanguage: LanguageCode;
  private scriptStyle: ScriptStyle; // 추가된 타입

  constructor(
    apiKey: string,
    voice: Voice,
    temperature: string,
    gptModel: string,
    subtitlesToggle: boolean,
    outputLanguage: LanguageCode,
    scriptStyle: ScriptStyle,
  ) {
    this.openai = new OpenAI({ apiKey });
    this.voice = voice;
    this.temperature = parseFloat(temperature);
    this.gptModel = gptModel;
    this.subtitlesToggle = subtitlesToggle;
    this.outputLanguage = outputLanguage;
    this.scriptStyle = scriptStyle;
  }

  /**
   * Initializes the TextToSpeechProcessor with the provided configuration.
   * @param {string} apiKey - The API key for OpenAI.
   * @param {Voice} voice - The default voice to be used for text-to-speech.
   * @param {string} temperature - The creativity level for the AI responses.
   * @param {string} gptModel - The GPT model to be used for generating responses.
   * @param {boolean} subtitlesToggle - Toggle for displaying subtitles.
   * @param {LanguageCode} [outputLanguage] - The language code for translation output.
   */
  public async processSelectedText() {
    const currentIdentifier = Date.now().toString();
    await setCurrentCommandIdentifier(currentIdentifier);

    // kill all afplay processes if any are running
    await this.stopAllProcesses();

    console.log("outputLanguage: ", this.outputLanguage);

    try {
      let selectedText = await getSelectedText();

      if (this.outputLanguage) {
        console.log(this.outputLanguage, "Start writing script...");

        await showToast({
          style: Toast.Style.Animated,
          title: `Writing a ${this.scriptStyle} script... 🔍`,
          message: "Please wait while the script is being written.",
        });

        const scriptStyleContent = SCRIPT_STYLES_PROMPTS[this.scriptStyle]; // Use the script style preference

        // Use the OpenAI completion endpoint to translate and script the selected text
        const translation = await this.openai.chat.completions.create({
          model: this.gptModel,
          temperature: this.temperature,
          messages: [
            {
              role: "system",
              content: `Create a ${this.outputLanguage} ${scriptStyleContent}`,
            },
            { role: "user", content: selectedText },
          ],
          // max_tokens: 60, // Adjust as needed
        });
        selectedText = translation.choices[0].message.content as string;

        await showToast({
          style: Toast.Style.Success,
          title: "🎉 Script Writing Complete",
          message: "The script has been successfully written in English.",
        });
      }

      const sentences = splitSentences(selectedText);

      this.textToSpeechQueue = sentences.reduce((acc: string[], sentence: string) => {
        if (acc.length === 0 || acc[acc.length - 1].length >= MIN_TEXT_QUE_SENTENCE_LENGTH) {
          acc.push(sentence);
        } else {
          acc[acc.length - 1] += " " + sentence;
        }
        return acc;
      }, []);

      if (!this.isConverting) {
        console.log("Converting text to speech...");
        await this.convertTextToSpeech(currentIdentifier);
      }
      await this.waitForQueuesToEmpty();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select text first",
        message: String(error),
      });
    }
  }

  /**
   * Converts the text from the queue into speech by iterating over the queue,
   * generating an audio file for each text part, and then pushing it to the play queue.
   * It sets the `isConverting` flag to true at the start and to false once done.
   */
  private async convertTextToSpeech(currentIdentifier: string) {
    this.isConverting = true;

    for (const textPart of this.textToSpeechQueue) {
      const activeIdentifier = await getCurrentCommandIdentifier();
      if (activeIdentifier !== currentIdentifier) {
        console.log("🚫 💬 A new command task has started. Stopping current text-to-speech task");
        return; // Exit the loop if a new command has started
      }

      if (textPart.trim().length > 0) {
        const speechFile = path.resolve(os.tmpdir(), `speech_${Date.now()}.mp3`);
        // console.log("Converting text to speech:", textPart, speechFile);
        try {
          const mp3 = await this.openai.audio.speech.create({
            model: "tts-1",
            voice: this.voice,
            input: textPart,
          });
          const buffer = Buffer.from(await mp3.arrayBuffer());
          await fs.writeFile(speechFile, buffer);
          this.playAudioQueue.push({ filePath: speechFile, text: textPart });
          console.log("🚀 ~ Converted text to speech:", textPart);
        } catch (error) {
          console.error("Error converting text to speech:", error);
        }

        if (!this.isPlaying) {
          this.playAudio(currentIdentifier);
        }
      } else {
        console.log("Skipped empty or invalid text part");
      }
    }
    console.log("🚀 ~ Finished converting text to speech");

    this.textToSpeechQueue = [];
    this.isConverting = false;
  }

  /**
   * Method to play audio files. It sequentially plays audio files from the playAudioQueue.
   * Once playback is complete, it deletes the file.
   */
  private async playAudio(currentIdentifier: string) {
    while (this.playAudioQueue.length > 0) {
      const activeIdentifier = await getCurrentCommandIdentifier();
      if (activeIdentifier !== currentIdentifier) {
        console.log("🚫 🔇 A new task command has started. Stopping audio tasks");
        showToast({
          style: Toast.Style.Success,
          title: "Task Interrupted",
          message: "A new task has started. The current audio task has been stopped.",
        });
        return; // Exit the loop if a new command has started
      }
      this.isPlaying = true;
      const { filePath, text } = this.playAudioQueue.shift()!;
      try {
        console.log("Playing audio:", filePath, text);
        if (this.subtitlesToggle) {
          showToast({
            style: Toast.Style.Animated,
            title: text,
            message: text,
          });
        }

        await execAsync(`afplay ${filePath}`);
      } catch (error) {
        console.error("Error playing audio:", "file is deleted or moved");
      } finally {
        // Attempting to delete the file.
        fs.unlink(filePath).catch((err) => {
          if (err.code !== "ENOENT") {
            console.error(`Error deleting file: ${filePath}`, err);
          }
        });
        // this.audioProcess = null;
      }
      this.isPlaying = false;
    }
  }

  /**
   * Method to stop all afplay processes.
   */
  public async stopAllProcesses() {
    try {
      // Check for existing afplay processes
      const { stdout: pgrepStdout } = await execAsync("pgrep afplay");
      if (pgrepStdout) {
        // If afplay processes are found, kill them
        const { stdout, stderr } = await execAsync("pkill afplay");
        if (stderr) {
          console.error(`stderr from pkill: ${stderr}`);
        }
        console.log(`stdout from pkill: ${stdout}`);
      }
    } catch (error: unknown) {
      // Handle the case where no afplay processes are found
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Error in stopAllProcesses: ${(error as Error).message}`);
      }
    }
    // Attempting to clean up the temporary mp3 files
    await cleanupTmpDir();
  }

  /**
   * Method to wait for all queues to be empty.
   */
  private async waitForQueuesToEmpty() {
    while (this.textToSpeechQueue.length > 0 || this.playAudioQueue.length > 0 || this.isConverting || this.isPlaying) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const processor = new TextToSpeechProcessor(
    preferences.apiKey,
    preferences.defaultVoice,
    preferences.temperature,
    preferences.gptModel,
    preferences.subtitlesToggle,
    preferences.outputLanguage,
    preferences.scriptStyle,
  );
  await processor.processSelectedText();
}
