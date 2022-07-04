/*
 * @author: tisfeng
 * @createTime: 2022-06-22 16:22
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-03 18:09
 * @fileName: audio.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import { exec, execFile } from "child_process";
import axios from "axios";
import fs from "fs";
import { languageItemList } from "./consts";
import playerImport = require("play-sound");
import { trimTextLength } from "./utils";
const player = playerImport({});

const audioDirPath = `${environment.supportPath}/audio`;

/**
  use play-sound to play local audio file, use say command when audio not exist. if error, use say command to play.
*/
export function playWordAudio(word: string, fromLanguage: string, useSayCommand = true) {
  const audioPath = getWordAudioPath(word);
  if (!fs.existsSync(audioPath)) {
    console.log(`word audio file not found: ${word}`);
    if (useSayCommand) {
      return sayTruncateCommand(word, fromLanguage);
    }
  }
  console.log(`play word: ${word}`);

  return player.play(audioPath, (err) => {
    if (err) {
      // afplay play the word 'set' throw error: Fail: AudioFileOpenURL failed ???
      console.error(`play word audio error: ${err}`);
      console.log(`audioPath: ${encodeURI(audioPath)}`);
      return sayTruncateCommand(word, fromLanguage);
    }
  });
}

/**
  use shell afplay to play audio
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function afplayAudioPath(audioPath: string) {
  console.log(`play audio: ${audioPath}`);
  if (!fs.existsSync(audioPath)) {
    console.error(`audio file not exists: ${audioPath}`);
    return;
  }
  execFile("afplay", [audioPath], (error, stdout) => {
    if (error) {
      console.error(`afplay error: ${error}`);
    }
    console.log(`afplay stdout: ${stdout}`);
  });
}

/**
  Use shell say to play text sound, if text is too long that can't be stoped, so truncate it.
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
    const languageItem = languageItemList.find((languageItem) => languageItem.youdaoLanguageId === youdaoLanguageId);
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
    const childProcess = exec(sayCommand, (error) => {
      if (error) {
        console.error(`sayCommand error: ${error}`);
      }
    });

    return childProcess;
  }
}

export function downloadWordAudioWithURL(
  word: string,
  url: string,
  callback?: () => void,
  forceDownload = false
): void {
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
      callback && callback();
      return;
    }
    console.log(`forced download audio, url: ${url}`);
  }
  console.log(`download audio, url: ${url}`);

  try {
    const response = await axios.get(url, { responseType: "stream" });
    const fileStream = fs.createWriteStream(audioPath);
    response.data.pipe(fileStream);
    fileStream.on("finish", () => {
      fileStream.close();
      callback && callback();
    });
  } catch (error) {
    console.error(`download url audio error: ${error}, url: ${url}`);
  }
}

/**
  get audio file name, if audio directory is empty, create it
*/
export function getWordAudioPath(word: string) {
  if (!fs.existsSync(audioDirPath)) {
    fs.mkdirSync(audioDirPath);
  }
  return `${audioDirPath}/${word}.mp3`;
}
