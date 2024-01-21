import { getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { OpenAI } from "openai";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import os from "os";
import util from "util";
import { SCRIPT_STYLES_PROMPTS } from "./const/index";

const execAsync = util.promisify(exec);

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
type ScriptStyle = keyof typeof SCRIPT_STYLES_PROMPTS; // 추가된 타입
type LanguageCode = string; // 추가된 타입

interface Preferences {
  apiKey: string;
  defaultVoice: Voice;
  temperature: string;
  gptModel: string;
  subtitlesToggle: boolean;
  outputLanguage: LanguageCode;
  scriptStyle: ScriptStyle; // 추가된 타입
}

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
  private static identifierFilePath = path.join(os.tmpdir(), "raycast-tts-identifier.txt");
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

  private async setCurrentCommandIdentifier(identifier: string) {
    await fs.writeFile(TextToSpeechProcessor.identifierFilePath, identifier, "utf8");
  }

  private async getCurrentCommandIdentifier() {
    try {
      return await fs.readFile(TextToSpeechProcessor.identifierFilePath, "utf8");
    } catch (error) {
      console.error("Error reading the current command identifier:", error);
      return null;
    }
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
    await this.setCurrentCommandIdentifier(currentIdentifier);

    // kill all afplay processes if any are running
    await this.stopAllProcesses();

    console.log("outputLanguage: ", this.outputLanguage);

    try {
      let selectedText = await getSelectedText();

      if (this.outputLanguage) {
        console.log(this.outputLanguage, "Start writing script...");
        // 사용자에게 번역이 진행 중임을 알리는 토스트 메시지를 표시합니다.
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

        // 번역이 완료되었음을 알리는 토스트 메시지를 표시합니다.
        await showToast({
          style: Toast.Style.Success,
          title: "🎉 Script Writing Complete",
          message: "The script has been successfully written in English.",
        });
      }

      /**
       * Splits the selected text into sentences using a regular expression that
       * looks for period, exclamation mark, or question mark followed by a space
       * or a newline character, but not preceded or followed by a digit (to avoid
       * splitting at decimal points or dates).
       * Each sentence is then trimmed of whitespace, and only non-empty sentences
       * are kept.
       */
      const sentences = selectedText
        .split(/(?<!\d)[.!?](?!\d)\s|\n/)
        .map((s: string) => s.trim()) // Explicitly annotate the parameter type
        .filter((s: string) => s.length > 0);

      const MIN_SENTENCE_LENGTH = 10; // set the minimum sentence length to 10 characters
      this.textToSpeechQueue = sentences.reduce((acc: string[], sentence: string) => {
        if (acc.length === 0 || acc[acc.length - 1].length >= MIN_SENTENCE_LENGTH) {
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
      const activeIdentifier = await this.getCurrentCommandIdentifier();
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
          this.playAudioQueue.push({ filePath: speechFile, text: textPart }); // 변경된 부분
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
      const activeIdentifier = await this.getCurrentCommandIdentifier();
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
        // 파일 삭제를 시도합니다.
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
   * Method to clean up temporary files in the tmp directory.
   */
  private async cleanupTmpDir() {
    const tmpdirPath = os.tmpdir();

    try {
      const files = await fs.readdir(tmpdirPath);
      const audioFiles = files.filter((file) => file.startsWith("speech_") && file.endsWith(".mp3"));
      console.log("🚀 ~ cleanupTmpDir audioFiles:", audioFiles);
      for (const file of audioFiles) {
        const filePath = path.resolve(tmpdirPath, file);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error(`Error deleting file: ${filePath}`, err);
          throw new Error(`Failed to delete file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up temporary directory:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Cleanup Failed",
        message: "Failed to clean up temporary directory.",
      });
    }
  }

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
    await this.cleanupTmpDir();
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
