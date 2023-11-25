import * as fs from "fs";
import * as https from "https";

import { temporaryFile } from "tempy";

import soundPlayer from "play-sound";
import { ChildProcess } from "child_process";

const TEMP_FILE_PATH = temporaryFile({ extension: "mp3" });

let audio: ChildProcess;

export const playAudio = (url: string) => {
  https.get(url, (response) => {
    const writeStream = fs.createWriteStream(TEMP_FILE_PATH);

    response.pipe(writeStream);

    writeStream.on("finish", () => {
      audio = soundPlayer().play(TEMP_FILE_PATH);
    });
  });
};

export const stopAudio = () => {
  audio.kill();
};
