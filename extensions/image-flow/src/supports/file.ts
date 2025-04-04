import fs from "fs";
import path from "path";

export async function saveStreamToTmpFile(stream: NodeJS.ReadableStream, filename: string): Promise<string> {
  // todo: widows support?
  const tmp = path.join("/tmp", `imageflow_${Date.now()}_${filename}`);

  console.log(tmp);

  return saveStreamToFile(stream, tmp);
}

export async function saveStreamToFile(stream: NodeJS.ReadableStream, outputPath: string): Promise<string> {
  const outputStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    stream.pipe(outputStream);
    stream.on("error", reject);
    outputStream.on("finish", () => resolve(outputPath));
  });
}
