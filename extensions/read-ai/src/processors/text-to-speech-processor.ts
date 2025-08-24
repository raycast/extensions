import { getSelectedText, showToast, Toast, closeMainWindow } from "@raycast/api";
import { OpenAI } from "openai";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { READING_STYLES_PROMPTS } from "../const";
import {
  stopAllProcesses,
  execAsync,
  getCurrentCommandIdentifier,
  setCurrentCommandIdentifier,
  splitSentences,
  parseSpeed,
} from "../utills";

type VoiceChoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export class TextToSpeechProcessor {
  private textToSpeechQueue: string[] = [];
  private playAudioQueue: { filePath: string; text: string }[] = [];
  private isPlaying = false;
  private isConverting = false;
  private openai: OpenAI;
  private voice: VoiceChoice;
  private temperature: string;
  private speed: number;
  private gptModel: string;
  private directRead: boolean;
  private subtitlesToggle: boolean;
  private outputLanguage: string;
  private readingStyle: string;
  public onScriptGenerated?: (script: string) => void;

  constructor(preferences: Preferences, onScriptGenerated?: (script: string) => void) {
    this.openai = new OpenAI({ apiKey: preferences.apiKey });
    this.voice = preferences.defaultVoice;
    this.temperature = preferences.temperature;
    this.gptModel = preferences.gptModel;
    this.subtitlesToggle = preferences.subtitlesToggle;
    this.outputLanguage = preferences.outputLanguage;
    this.readingStyle = preferences.readingStyle;
    try {
      this.speed = parseSpeed(preferences.speed);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid speed value, using default speed.",
        message: String(error),
      });
      this.speed = 1;
    }
    this.directRead = preferences.directRead;
    this.onScriptGenerated = onScriptGenerated;
  }
  // New method to handle text directly
  public async processTextDirectly(text: string) {
    // Use a unique identifier for the current process
    const currentIdentifier = Date.now().toString();
    await setCurrentCommandIdentifier(currentIdentifier);

    // Stop any currently playing audio
    await stopAllProcesses();

    // Split the text into sentences and add them to the queue
    const sentences = splitSentences(text);
    this.textToSpeechQueue = sentences;

    // Start converting text to speech if not already doing so
    if (!this.isConverting) {
      await this.convertTextToSpeech(currentIdentifier);
    }

    // Wait for the queues to empty before finishing
    await this.waitForQueuesToEmpty();
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

    const activeIdentifier = await getCurrentCommandIdentifier();
    if (activeIdentifier !== currentIdentifier) {
      console.log("🚫 💬 A new command task has started. Stopping current text-to-speech task");
      return; // Exit the loop if a new command has started
    }

    // kill all afplay processes if any are running
    await stopAllProcesses();

    try {
      let selectedText = await getSelectedText();

      if (this.outputLanguage && selectedText && !this.directRead) {
        console.log("outputLanguage: ", this.outputLanguage);
        console.log(this.outputLanguage, "Start writing script...");

        await showToast({
          style: Toast.Style.Animated,
          title: `✍🏼 Writing a script... [${this.readingStyle} mode]`,
          message: "Please wait while the script is being written.",
        });

        const readingStyleContent = READING_STYLES_PROMPTS[this.readingStyle as keyof typeof READING_STYLES_PROMPTS]; // Use the script style preference

        const prompt = `
        You are an advanced AI reading assistant with these key responsibilities:
        - Translate and adapt text for optimal text-to-speech conversion.

        Requirements:
        - The final script must be in ${this.outputLanguage}.
        - Adhere to the reading style specified in "${readingStyleContent}".
        - Produce a script of professional quality, ready for immediate text-to-speech use.
        - If the source of the original text or media is known, mention it. If the time of writing or sharing is relevant, include it. Otherwise, these details can be omitted.
        - Maintain factual accuracy and neutrality, presenting information engagingly and clearly.
        - Avoid assumptions. Focus on preparing the script for text-to-speech conversion.

        Begin the translation and script adaptation process now:
        `.trim();

        // Use the OpenAI completion endpoint to translate and script the selected text
        const script = await this.openai.chat.completions.create({
          model: this.gptModel,
          temperature: Number(this.temperature),
          messages: [
            {
              role: "system",
              content: prompt,
            },
            { role: "user", content: selectedText },
          ],

          // max_tokens: 60, // Adjust as needed
        });

        selectedText = script.choices[0].message.content as string;
        console.log("🚀 ~ TextToSpeechProcessor ~ processSelectedText ~ selectedText:", selectedText);

        await showToast({
          style: Toast.Style.Success,
          title: "🎉 Script Writing Complete",
          message: "The script has been successfully written in English.",
        });

        // Call the callback function to update the state once the script processing is complete.
        if (this.onScriptGenerated) {
          this.onScriptGenerated(selectedText);
        }
      }

      const sentences = splitSentences(selectedText);

      this.textToSpeechQueue = sentences;

      if (!this.isConverting) {
        console.log("Converting text to speech...");
        await this.convertTextToSpeech(currentIdentifier);
      }
      await this.waitForQueuesToEmpty();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: String(error),
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
            speed: this.speed,
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
        closeMainWindow();
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
            title: `💬 ${text}`,
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
    if (!this.isConverting && this.playAudioQueue.length === 0) {
      showToast({
        style: Toast.Style.Success,
        title: "🎉 Audio Playback Finished",
        message: "All audio has been successfully played back.",
      });
    }
  }

  /**
   * Method to wait for all queues to be empty.
   */
  private async waitForQueuesToEmpty() {
    while (this.textToSpeechQueue.length > 0 || this.playAudioQueue.length > 0 || this.isConverting || this.isPlaying) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Add this method to the TextToSpeechProcessor class
  public async stopProcessing() {
    // Stop any ongoing audio playback
    if (this.isPlaying) {
      await stopAllProcesses();
      this.isPlaying = false;
    }

    // Clear the queues
    this.textToSpeechQueue = [];
    this.playAudioQueue = [];

    // Reset converting and playing flags
    this.isConverting = false;
    this.isPlaying = false;

    // Optionally, you can also reset the onScriptGenerated callback if needed
    // this.onScriptGenerated = undefined;
  }
}
