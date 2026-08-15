// Helper functions needed throughout the process to download the better-sqlite3 native binding,
// extracting it from the .tar.gz file and moving it to the desired location.
//
// Credit goes to the code-saver extension, from where I copied these functions
// https://github.com/raycast/extensions/blob/22536f8facd9a6f92ff3a5487f20f987adcb4222/extensions/code-saver/src/lib/utils/download-file.ts
// .

import https from "https";
import tar from "tar-stream";
import zlib from "zlib";
import fs from "fs";

export async function downloadFile(url: string, targetFile: string): Promise<void> {
  return await new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const code = response.statusCode ?? 0;

        if (code >= 400) {
          return reject(new Error(response.statusMessage));
        }

        // handle redirects
        if (code > 300 && code < 400 && !!response.headers.location) {
          return resolve(downloadFile(response.headers.location, targetFile));
        }

        // save the file to disk
        const fileWriter = fs.createWriteStream(targetFile).on("finish", resolve).on("error", reject);
        response.pipe(fileWriter);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

export async function extractAndRewrite(tarball: string, targetFile: string, dstFile: string): Promise<void> {
  return await new Promise((resolve, reject) => {
    const extract = tar.extract();
    const chunks: Uint8Array[] = [];

    extract.on("entry", function (header, stream, next) {
      if (header.name === targetFile) {
        stream.on("data", function (chunk) {
          chunks.push(chunk);
        });
      }
      stream.on("end", function () {
        next();
      });
      stream.resume();
    });

    extract.on("finish", function () {
      if (chunks.length) {
        const data = Buffer.concat(chunks);
        fs.writeFile(dstFile, data, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      } else {
        reject(new Error(`Target file ${targetFile} not found in tarball`));
      }
    });

    fs.createReadStream(tarball).pipe(zlib.createGunzip().on("error", reject)).pipe(extract);
  });
}
