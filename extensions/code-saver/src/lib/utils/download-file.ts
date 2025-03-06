import Fs from "fs";
import Https from "https";
import tar from "tar-stream";
import zlib from "zlib";
import fs from "fs";

export async function DownloadFile(url: string, targetFile: string): Promise<void> {
  return await new Promise((resolve, reject) => {
    Https.get(url, (response) => {
      const code = response.statusCode ?? 0;

      if (code >= 400) {
        return reject(new Error(response.statusMessage));
      }

      // handle redirects
      if (code > 300 && code < 400 && !!response.headers.location) {
        return resolve(DownloadFile(response.headers.location, targetFile));
      }

      // save the file to disk
      const fileWriter = Fs.createWriteStream(targetFile).on("finish", () => {
        resolve();
      });

      response.pipe(fileWriter);
    }).on("error", (error) => {
      reject(error);
    });
  });
}

export async function ExtractAndRewrite(tarball: string, targetFile: string, dstFile: string): Promise<void> {
  return await new Promise((resolve, reject) => {
    const extract = tar.extract();
    const chunks: Uint8Array[] = [];

    extract.on("entry", function (header, stream, next) {
      if (header.name == targetFile) {
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
      }
    });

    fs.createReadStream(tarball).pipe(zlib.createGunzip()).pipe(extract);
  });
}
