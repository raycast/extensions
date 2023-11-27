import * as fs from 'fs';
import axios from 'axios';
import { getPreferenceValues } from "@raycast/api";
import os from 'os'
import path from 'path';

export async function downloadFile(url: string, filename: string, downloadPercentUpdated: (mb: number) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const preferences: Preferences = getPreferenceValues();
    const githubToken = preferences.githubToken;
    console.log(`URL to be downloaded ${url}`)
    const filePath = `${os.homedir()}/Downloads/raycast/${filename}`
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await axios(url, {
      method: "GET",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/zip",
      },
      responseType: "stream",
      onDownloadProgress: (progressEvent) => {
        const numMB = progressEvent.loaded / 1000000
        console.log(`${numMB} MB`)
        downloadPercentUpdated(numMB)
      },

    })
    console.log(`Response status code: ${response.status}`)
    const fileStream = fs.createWriteStream(filePath)
    response.data.pipe(fileStream)
    fileStream.on("error", reject)
    fileStream.on("finish", () => {
      console.log(`File downloaded successfully: ${filePath}`);
      resolve(filePath)
    });
  })
};
