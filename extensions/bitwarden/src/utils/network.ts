import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { parse } from "url";
import http from "http";
import https from "https";
import { captureException } from "~/utils/development";

const maxRedirects = 10;
export function download(url: string, path: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const uri = parse(url);
    const protocol = uri.protocol === "https:" ? https : http;

    let redirectCount = 0;
    const request = protocol.get(uri.href, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect response without location header`));
          return;
        }

        request.destroy();
        if (++redirectCount >= maxRedirects) {
          reject(new Error("Too many redirects"));
          return;
        }
        download(redirectUrl, path, onProgress).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Response status ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const fileStream = createWriteStream(path);
      const fileSize = parseInt(response.headers["content-length"] || "0", 10);
      if (fileSize === 0) {
        reject(new Error("Invalid file size"));
        return;
      }

      let downloadedSize = 0;
      const chunks: Buffer[] = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
        downloadedSize += chunk.length;
        onProgress?.(Math.floor((downloadedSize / fileSize) * 100));
      });

      response.on("end", () => {
        if (fileSize > 0 && downloadedSize !== fileSize) {
          reject(new Error(`Download incomplete: expected ${fileSize} bytes but got ${downloadedSize} bytes`));
          return;
        }

        // Write the chunks all at once. Seems to be more reliable.
        for (const chunk of chunks) {
          fileStream.write(chunk);
        }

        onProgress?.(100);
        fileStream.on("finish", resolve);
        fileStream.end();
      });

      response.on("error", async (error) => {
        fileStream.close();
        await unlink(path);
        captureException(`Failed to download file ${url}`, error);
        reject(error);
      });
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}
