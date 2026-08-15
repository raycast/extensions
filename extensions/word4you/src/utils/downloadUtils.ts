import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { promisify } from "util";
import https from "https";
import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { mkdir } from "fs/promises";

// Helper function to calculate SHA256 hash of a file
export async function verifyFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

// Helper function to download a file with redirect support
export async function downloadFile(url: string, destDir: string, options: { filename: string }): Promise<string> {
  const streamPipeline = promisify(pipeline);
  const destPath = path.join(destDir, options.filename);

  await mkdir(destDir, { recursive: true });

  // Function to handle HTTP requests with redirect support
  const fetchWithRedirects = (currentUrl: string, redirectCount = 0): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Maximum number of redirects to follow
      const MAX_REDIRECTS = 5;

      if (redirectCount >= MAX_REDIRECTS) {
        reject(new Error(`Too many redirects (${redirectCount})`));
        return;
      }

      // Parse URL to determine if it's HTTP or HTTPS
      https
        .get(currentUrl, async (response: import("http").IncomingMessage) => {
          // Handle redirects (status codes 301, 302, 303, 307, 308)
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            console.log(`Following redirect (${response.statusCode}) to: ${response.headers.location}`);
            // Follow the redirect
            return resolve(fetchWithRedirects(response.headers.location, redirectCount + 1));
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          try {
            await streamPipeline(response, createWriteStream(destPath));
            resolve(destPath);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", reject);
    });
  };

  return fetchWithRedirects(url);
}
