import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { parse } from "url";
import fetch from "node-fetch";
import { captureException } from "~/utils/development";

export function download(url: string, path: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const uri = parse(url);

    fetch(uri.href)
      .then((response) => {
        if (!response.ok) throw new Error(`Response status ${response.status}: ${response.statusText}`);
        if (!response.body) throw new Error("No response body");

        const fileStream = createWriteStream(path);
        const fileSize = parseInt(response.headers.get("content-length") || "0", 10);
        if (fileSize === 0) throw new Error("Invalid file size");

        let downloadedSize = 0;
        response.body.on("data", (chunk) => {
          fileStream.write(chunk);
          downloadedSize += chunk.length;
          onProgress?.(Math.floor((downloadedSize / fileSize) * 100));
        });
        response.body.on("end", () => {
          fileStream.on("finish", resolve);
          fileStream.end();
        });
        response.body.on("error", async (error) => {
          fileStream.close();
          await unlink(path);
          captureException(`Failed to download file ${url}`, error);
          reject(error);
        });
      })
      .catch(reject);
  });
}
