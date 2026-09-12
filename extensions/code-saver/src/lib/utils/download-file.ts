import Https from "https";
import tar from "tar-stream";
import zlib from "zlib";
import fs from "fs";
import { arch } from "os";
import { Cache } from "@raycast/api";

export async function DownloadFile(url: string, targetFile: string): Promise<void> {
  console.log("DownloadFile: ", url, targetFile);
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
      const fileWriter = fs.createWriteStream(targetFile).on("finish", () => {
        console.log("DownloadFile finish: ", targetFile);
        resolve();
      });

      response.pipe(fileWriter);
    }).on("error", (error) => {
      reject(error);
    });
  });
}

export async function ExtractAndRewrite(tarball: string, targetFile: string, dstFile: string): Promise<void> {
  console.log("ExtractAndRewrite: ", tarball, targetFile, dstFile);
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
          console.log("ExtractAndRewrite finish: ", dstFile);
          resolve();
        });
      }
    });

    fs.createReadStream(tarball).pipe(zlib.createGunzip()).pipe(extract);
  });
}

// eslint-disable-next-line
function httpJsonGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    Https.get(
      url,
      {
        headers: {
          "User-Agent": "node-ts-client",
        },
      },
      (response) => {
        const code = response.statusCode ?? 0;
        let data = "";
        if (code >= 400) {
          return reject(new Error(response.statusMessage));
        }

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(new Error("Failed to parse JSON response"));
          }
        });
      }
    ).on("error", (err) => {
      reject(err);
    });
  });
}

export async function GetProperCipherAssetDownloadLink(): Promise<string> {
  console.log("GetProperCipherAssetDownloadLink");
  const _arch = arch();
  const match_str = `better-sqlite3-multiple-ciphers-v(\\d+(?:\\.\\d+)*)-node-v${process.versions.modules}-darwin-${_arch}\\.tar\\.gz`;
  const cache_key = "GITHUB_SQLITE_RELEASES";

  const cache = new Cache();
  if (!cache.has(cache_key)) {
    console.log("Cache miss, get releases from github");
    const releases = await httpJsonGet(
      "https://api.github.com/repos/m4heshd/better-sqlite3-multiple-ciphers/releases?per_page=10"
    );
    cache.set(cache_key, JSON.stringify(releases));
  }
  const releases = JSON.parse(cache.get(cache_key) ?? "[]");
  console.log("Releases:", releases);

  for (const release of releases) {
    for (const asset of release.assets) {
      // name is like better-sqlite3-multiple-ciphers-v11.10.0-node-v116-darwin-arm64.tar.gz
      const match = asset.name.match(match_str);
      if (match) {
        console.log("Found matching asset:", asset.name);
        console.log("asset.browser_download_url", asset.browser_download_url);
        return asset.browser_download_url;
      }
    }
  }
  throw new Error("No proper cipher asset found");
}
