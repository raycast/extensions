import { environment } from "@raycast/api";
import axios from "axios";
import { exec, execFile } from "child_process";
import fs from "fs";

import playerImport = require("play-sound");
import { languageItemList } from "./consts";
const player = playerImport({});

export const maxPlaySoundTextLength = 40;

const audioDirPath = `${environment.supportPath}/audio`;

export function playWordAudio(word: string) {
  const audioPath = getWordAudioPath(word);
  if (!fs.existsSync(audioPath)) {
    console.warn(`audio file not found: ${audioPath}`);
    return;
  }

  player.play(audioPath, (err) => {
    if (err) {
      console.error(`play word audio error: ${err}`);
    }
  });
}

// use shell afplay to play audio
export function playAudioPath(audioPath: string) {
  console.log(`play audio: ${audioPath}`);
  if (!fs.existsSync(audioPath)) {
    console.error(`audio file not exists: ${audioPath}`);
    return;
  }
  execFile("afplay", [audioPath], (error, stdout) => {
    if (error) {
      console.error(`exec error: ${error}`);
    }
    console.log(stdout);
  });
}

export function sayTruncateCommand(text: string, language: string) {
  const truncateText = text.substring(0, maxPlaySoundTextLength) + "...";
  sayCommand(truncateText, language);
}

function sayCommand(text: string, language: string) {
  if (language && text) {
    const voiceIndex = 0;
    for (const LANG of languageItemList) {
      if (language === LANG.youdaoLanguageId) {
        const safeText = text.replace(/"/g, " ");
        const sayCommand = `say -v ${LANG.languageVoice[voiceIndex]} '${safeText}'`;
        console.log(sayCommand);
        LANG.languageVoice.length > 0 && exec(sayCommand);
      }
    }
  }
}

export function downloadWordAudioWithURL(word: string, url: string, callback?: () => void) {
  const audioPath = getWordAudioPath(word);
  downloadAudio(url, audioPath, callback);
}

export function downloadAudio(url: string, audioPath: string, callback?: () => void) {
  if (fs.existsSync(audioPath)) {
    callback && callback();
    return;
  }

  axios({
    method: "get",
    url: url,
    responseType: "stream",
  })
    .then((response) => {
      response.data.pipe(
        fs.createWriteStream(audioPath).on(
          "close",
          callback
            ? callback
            : () => {
                // do nothing
              }
        )
      );
    })
    .catch((error) => {
      console.error(`download url audio error: ${error}`);
    });
}

// function: get audio file name, if audio directory is empty, create it
export function getWordAudioPath(word: string) {
  if (!fs.existsSync(audioDirPath)) {
    fs.mkdirSync(audioDirPath);
  }
  return `${audioDirPath}/${word}.mp3`;
}
