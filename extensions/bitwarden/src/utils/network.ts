import { createWriteStream, unlink } from "fs";
import http from "http";
import https from "https";
import { captureException } from "~/utils/development";
import { getFileSha256 } from "~/utils/crypto";
import { waitForFileAvailable } from "~/utils/fs";

type DownloadOptions = {
  onProgress?: (percent: number) => void;
  sha256?: string;
};

export function download(url: string, path: string, options?: DownloadOptions): Promise<void> {
  const { onProgress, sha256 } = options ?? {};

  return new Promise((resolve, reject) => {
    const uri = new URL(url);
    const protocol = uri.protocol === "https:" ? https : http;

    let redirectCount = 0;
    const request = protocol.get(uri.href, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        request.destroy();
        response.destroy();

        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect response without location header`));
          return;
        }

        if (++redirectCount >= 10) {
          reject(new Error("Too many redirects"));
          return;
        }

        download(redirectUrl, path, options).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Response status ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const fileSize = parseInt(response.headers["content-length"] || "0", 10);
      if (fileSize === 0) {
        reject(new Error("Invalid file size"));
        return;
      }

      const fileStream = createWriteStream(path, { autoClose: true });
      let downloadedBytes = 0;

      const cleanup = () => {
        request.destroy();
        response.destroy();
        fileStream.close();
      };

      const cleanupAndReject = (error?: Error) => {
        cleanup();
        reject(error);
      };

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const percent = Math.floor((downloadedBytes / fileSize) * 100);
        onProgress?.(percent);
      });

      fileStream.on("finish", async () => {
        try {
          await waitForFileAvailable(path);
          if (sha256) await waitForHashToMatch(path, sha256);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          cleanup();
        }
      });

      fileStream.on("error", (error) => {
        captureException(`File stream error while downloading ${url}`, error);
        unlink(path, () => cleanupAndReject(error));
      });

      response.on("error", (error) => {
        captureException(`Response error while downloading ${url}`, error);
        unlink(path, () => cleanupAndReject(error));
      });

      request.on("error", (error) => {
        captureException(`Request error while downloading ${url}`, error);
        unlink(path, () => cleanupAndReject(error));
      });

      response.pipe(fileStream);
    });
  });
}

function waitForHashToMatch(path: string, sha256: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getFileSha256(path) === sha256) return resolve();

    const interval = setInterval(() => {
      if (getFileSha256(path) === sha256) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Hash did not match, expected ${sha256.substring(0, 7)}.`));
    }, 5000);
  });
}
