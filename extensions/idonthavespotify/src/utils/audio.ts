import * as fs from "fs";
import * as https from "https";

import { temporaryFile } from "tempy";
import * as sound from "sound-play";

const TEMP_FILE_PATH = temporaryFile({ extension: "mp3" });

export const playAudio = (url: string) => {
  https.get(url, (response) => {
    const writeStream = fs.createWriteStream(TEMP_FILE_PATH);

    response.pipe(writeStream);

    writeStream.on("finish", () => {
      sound.play(TEMP_FILE_PATH);
    });
  });
};
