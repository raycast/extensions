import { getSelectedText, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";

import { OpenAI } from "openai";
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface Preferences {
  apiKey: string;
  defaultVoice: Voice;
}

export default async function Command() {
  await textToSpeech();
}

async function textToSpeech() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  const voice = preferences.defaultVoice;
  const openai = new OpenAI({
    apiKey: apiKey,
  })

  try {
    const selectedText = await getSelectedText();
    const speechFile = path.resolve(os.tmpdir(), `speech_${Date.now()}.mp3`);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: selectedText
    })
    console.log(speechFile);
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    // Play the audio file and close the command window
    await new Promise((resolve, reject) => {
      exec(`afplay ${speechFile}`, (error) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(error);
          return;
        }
        resolve(null);
      });
    });

    await closeMainWindow({ clearRootSearch: true });
    
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot Speak text",
      message: String(error)
    });
  }
}