import { environment, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const sfxPath = environment.assetsPath + "/sfx/";
const supportedExtensions = [".wav", ".mp3"];

export default async function main() {
  await getSoundFiles(sfxPath).then((soundFiles: string[]) => {
    if (soundFiles.length > 0) {
      exec(`afplay ${sfxPath + getRandomFart(soundFiles)}`);
    }
  });

  await closeMainWindow();
}

function getSoundFiles(dirPath: string) {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      // Filter for files with supported audio extensions
      const soundFiles = files.filter((file) => {
        const fileExt = path.extname(file).toLowerCase();
        for (const suppExt of supportedExtensions) {
          return fileExt == suppExt;
        }
      });

      resolve(soundFiles);
    });
  });
}

function getRandomFart(arr: string[]) {
  if (arr.length === 0) {
    throw new Error("Array is empty");
  }

  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}
