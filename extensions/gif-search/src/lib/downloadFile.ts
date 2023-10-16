import { createWriteStream, existsSync } from "fs";
import fetch from "node-fetch";
import { homedir } from "os";

const basePath = `${homedir()}/Downloads`;

export default async function downloadFile(url: string, name: string) {
  const response = await fetch(url);

  if (!response.body) {
    throw new Error();
  }

  let filePath = `${basePath}/${name}`;

  // Prevent overriding existing files with the same name
  if (existsSync(filePath)) {
    let counter = 1;
    const fileNameWithoutExtension = name.split(".")[0];
    const fileExtension = name.split(".")[1];

    do {
      filePath = `${basePath}/${fileNameWithoutExtension} (${counter}).${fileExtension}`;
      counter++;
    } while (existsSync(filePath));
  } else {
    const fileStream = createWriteStream(filePath);
    await response.body?.pipe(fileStream);
  }

  const fileStream = createWriteStream(filePath);
  response.body?.pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on("finish", () => {
      return resolve(filePath);
    });

    fileStream.on("error", () => {
      return reject();
    });
  });
}
