import * as fs from "fs";
import * as https from "https";
import * as os from "os";
import * as path from "path";

import soundPlayer from "play-sound";
import { ChildProcess } from "child_process";

let _tempFilePath: string;

const getTempFilePath = (): string => {
  if (_tempFilePath) {
    return _tempFilePath;
  }

  const tempDir = os.tmpdir();
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  _tempFilePath = path.join(tempDir, `audio-${uniqueSuffix}.mp3`);

  return _tempFilePath;
};

let audio: ChildProcess;

export const playAudio = (url: string) => {
  const tempFilePath = getTempFilePath();

  https.get(url, (response) => {
    const writeStream = fs.createWriteStream(tempFilePath);

    response.pipe(writeStream);

    writeStream.on("finish", () => {
      audio = soundPlayer().play(tempFilePath);
    });
  });
};

export const stopAudio = () => {
  if (audio) {
    audio.kill();
  }
};
