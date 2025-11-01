import fs from "fs";
import path from "path";
import * as os from "node:os";

export async function saveStreamToTmpFile(stream: NodeJS.ReadableStream, filename: string): Promise<string> {
  const tmp = path.join(os.tmpdir(), `imageflow_${Date.now()}_${filename}`);

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
