/*
 * @author: tisfeng
 * @createTime: 2022-06-22 16:22
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-07 19:58
 * @fileName: audio.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import axios from "axios";
import { ExecException } from "child_process";
import { execa } from "execa";
import { fileTypeFromFile } from "file-type";
import fs from "fs";
import path from "path";
import playerImport from "play-sound";
import { languageItemList } from "./language/consts";
import { printObject, trimTextLength } from "./utils";

console.log(`enter audio.ts`);

const audioDirPath = `${environment.supportPath}/audio`;
console.log(`audio path: ${audioDirPath}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let audioPlayer: any; // Play

/**
 * Use play-sound to play local audio file, use say command when audio not exist. if error, use say command to play.
 */
export async function playWordAudio(word: string, fromLanguage: string, useSayCommand = true) {
  let audioPath = getWordAudioPath(word);
  if (!fs.existsSync(audioPath)) {
    console.log(`word audio file not found: ${word}`);
    if (useSayCommand) {
      sayTruncateCommand(word, fromLanguage);
    }
    return;
  }

  console.log(`play local file audio: ${path.basename(audioPath)}`);

  if (!audioPlayer) {
    // * Note: this new object will cost ~0.4s
    audioPlayer = playerImport({});
    console.log(`not exist, new a audioPlayer`);
  }

  // Because afplay can't play audio files with .mp3 suffix that are actually .wav, let's try to convert the format.
  if (await isWavFile(audioPath)) {
    const m4aFilePath = await tryConvertAudioToM4a(audioPath);
    if (m4aFilePath) {
      audioPath = m4aFilePath;
    }
  }

  // const audioPlayer = playerImport({});
  audioPlayer.play(audioPath, (err: ExecException) => {
    if (err) {
      if (err.killed) {
        console.log("audio has been killed");
        return;
      }

      // afplay play the word 'set' throw error: Fail: AudioFileOpenURL failed ???
      console.error(`play word audio error: ${err}`);
      console.log(`audioPath: ${encodeURI(audioPath)}`);
      sayTruncateCommand(word, fromLanguage);
    }
  });
}

/**
  Use shell say to play text sound, if text is too long that can't be stopped, so truncate it.
  */
export function sayTruncateCommand(text: string, youdaoLanguageId: string) {
  const truncateText = trimTextLength(text, 40);
  return sayCommand(truncateText, youdaoLanguageId);
}

/**
  use shell say to play text sound
*/
function sayCommand(text: string, youdaoLanguageId: string) {
  if (youdaoLanguageId && text) {
    const languageItem = languageItemList.find((languageItem) => languageItem.youdaoLangCode === youdaoLanguageId);
    if (!languageItem || !languageItem.voiceList) {
      console.warn(`say command language not supported: ${youdaoLanguageId}`);
      return;
    }

    // replace " with blank space, otherwise say command will not work.
    text = text.replace(/"/g, " ");
    const voice = languageItem.voiceList[0]; // say -v Ting-Ting hello
    /**
     * Specify play rate, in words per minute. The default is?, seems has valid range.
     *
     * say -r 60 "hello"
     * say "[[rate 60]] hello"
     */
    const sayCommand = `say -v ${voice} "${text}" `; // you're so beautiful, my "unfair" girl
    console.log(sayCommand);

    execa(sayCommand, { shell: true }).catch((error) => {
      console.error(`sayCommand error: ${error}`);
    });
  }
}

export function downloadWordAudioWithURL(
  word: string,
  url: string,
  callback?: () => void,
  forceDownload = false,
): void {
  console.log(`down load word: ${word}, audio url: ${url}`);
  const audioPath = getWordAudioPath(word);
  downloadAudio(url, audioPath, callback, forceDownload);
}

/**
 * @param url the audio url to download
 * @param audioPath the path to store audio
 * @param callback callback when after download audio
 * @param forceDownload is forced download when audio has exist
 */
export async function downloadAudio(url: string, audioPath: string, callback?: () => void, forceDownload = false) {
  if (fs.existsSync(audioPath)) {
    if (!forceDownload) {
      const word = audioPath.substring(audioPath.lastIndexOf("/") + 1);
      console.log(`download audio has exist: ${word}`);
      callback?.();
      return;
    }
    console.log(`forced download audio, url: ${url}`);
  }
  console.log(`start download audio, url: ${url}`);

  axios
    .get(url, { responseType: "stream" })
    .then(async (response) => {
      const fileStream = fs.createWriteStream(audioPath);

      response.data.pipe(fileStream);
      fileStream.on("finish", async () => {
        fileStream.close();
        await tryConvertAudioToM4a(audioPath);
        callback?.();
      });
    })
    .catch((error) => {
      if (error.message === "canceled") {
        console.log(`---> download audio canceled`);
        return;
      }
      console.error(`download url audio error: ${error}, url: ${url}`);
    });
}

/**
 * Get audio file name. If audio directory is empty, create it.
 */
export function getWordAudioPath(word: string) {
  if (!fs.existsSync(audioDirPath)) {
    fs.mkdirSync(audioDirPath);
  }

  const m4aFile = `${audioDirPath}/${word}.m4a`;
  if (fs.existsSync(m4aFile)) {
    return m4aFile;
  }

  const mp3File = `${audioDirPath}/${word}.mp3`;
  return mp3File;
}

/**
 * Try to convert wav file to m4a. eg: false
 */
async function tryConvertAudioToM4a(filePath: string) {
  if (await isWavFile(filePath)) {
    console.warn(`downloaded audio real data format is wav, try to convert to wav from mp3`);
    // rename file extension from mp3 to wav
    const wavPath = filePath.replace(".mp3", ".wav");
    fs.renameSync(filePath, wavPath);

    // convert wav to m4a
    return convertWavToM4a(wavPath);
  }
}

/**
 * Check file extension is wav or not.
 */
async function isWavFile(filePath: string) {
  const fileType = await fileTypeFromFile(filePath);
  printObject(`fileType`, fileType, 0);
  // good: { "ext": "mp3", "mime": "audio/mpeg" }
  // false: { "ext": "wav", "mime": "audio/vnd.wave" }

  const ext = fileType?.ext;
  return ext === "wav";
}

/**
 * Get file data format. Use execa 'file' command to get data format.
 */
export function getFileDataFormat(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execa("file", ["-b", "--mime-type", filePath])
      .then((result) => {
        const dataFormat = result.stdout;
        console.log(`file data format: ${dataFormat}`); // audio/x-wav
        resolve(dataFormat);
      })
      .catch((error) => {
        console.error(`getFileDataFormat error: ${error}`);
        reject(error);
      });
  });
}

/**
 * Check if file is 'wav' format.
 */
export function isWavFileType(filePath: string): Promise<boolean> {
  console.log(`check if file is wav format: ${filePath}`);
  return new Promise((resolve, reject) => {
    getFileDataFormat(filePath)
      .then((dataFormat) => {
        resolve(dataFormat === "audio/x-wav");
      })
      .catch((error) => {
        console.error(`isWavFile error: ${error}`);
        reject(error);
      });
  });
}

/**
 * Use afconver to convert wav file to m4a file in the same directory, if success, remove wav file.
 *
 * * Because wav file is too large, so convert to m4a file, which can be reduced to 1/10 of the original size.
 */
export function convertWavToM4a(filePath: string): Promise<string> {
  console.log(`convert wav file to m4a: ${filePath}`);

  return new Promise((resolve, reject) => {
    const m4aFilePath = filePath.replace(".wav", ".m4a"); // the same output filePath can be omitted.
    const afconvertCommand = `afconvert -f m4af -d aac '${filePath}' '${m4aFilePath}'`;
    // console.log(`afconvert command: ${afconvertCommand}`);

    execa(afconvertCommand, { shell: true })
      .then(() => {
        console.log(`afconvert success, then remove old wav file.`);
        fs.unlinkSync(filePath);
        resolve(m4aFilePath);
      })
      .catch((error) => {
        console.error(`afconvert error: ${error}`);
        reject(error);
      });
  });
}
