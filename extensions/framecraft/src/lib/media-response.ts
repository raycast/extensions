import http from "node:http";
import https from "node:https";

/** Read only the beginning of a response; never include URLs or response bodies in errors. */
export async function inspectMediaResponse(target: string, redirects = 0): Promise<void> {
  const url = new URL(target);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The video URL isn't an HTTP/HTTPS URL.");
  await new Promise<void>((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).get(
      url,
      {
        headers: { Range: "bytes=0-511", "Accept-Encoding": "identity" },
      },
      (response) => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          response.destroy();
          if (redirects >= 5) {
            reject(new Error("The video URL redirected too many times."));
            return;
          }
          inspectMediaResponse(new URL(response.headers.location, url).href, redirects + 1).then(resolve, reject);
          return;
        }
        if (status !== 200 && status !== 206) {
          response.destroy();
          reject(new Error(`The video server returned HTTP ${status}; no readable media was received.`));
          return;
        }
        const type = String(response.headers["content-type"] || "")
          .split(";")[0]
          .toLowerCase();
        let prefix = Buffer.alloc(0);
        const finish = () => {
          const sample = prefix.toString("utf8").trimStart();
          response.destroy();
          if (
            /html|json|xml/.test(type) ||
            /^(?:<!doctype html|<html|<\?xml|\{\s*"(?:error|message|code)")/i.test(sample)
          ) {
            reject(
              new Error(
                `The video URL returned a web page or API text (${type || "unknown type"}) instead of the original video. In Jellyfin/Emby, check that the item supports direct play, that its media source is valid, and your reverse proxy setup.`,
              ),
            );
          } else if (!prefix.length) reject(new Error("The video server returned an empty response."));
          else if (/^https?:\/\//i.test(sample) || /^#EXTM3U/i.test(sample)) {
            reject(
              new Error(
                "The server returned a link or playlist text instead of a direct media file. It can't be read as MKV/MP4; the actual media source needs to be resolved.",
              ),
            );
          } else if (prefix.subarray(0, 2).toString("ascii") === "PK") {
            reject(new Error("The server returned a ZIP archive, which can't be read as a single video file."));
          } else resolve();
        };
        response.on("data", (chunk: Buffer) => {
          prefix = Buffer.concat([prefix, chunk.subarray(0, 512 - prefix.length)]);
          if (prefix.length >= 512) finish();
        });
        response.on("end", finish);
        response.on("error", reject);
      },
    );
    const timer = setTimeout(
      () =>
        request.destroy(
          new Error("Timed out after 15 seconds waiting for the video response; no file header was received."),
        ),
      15000,
    );
    request.once("close", () => clearTimeout(timer));
    request.once("error", (error) =>
      reject(
        new Error(
          (error as NodeJS.ErrnoException).code === "ENOTFOUND"
            ? "Couldn't resolve the video server's hostname."
            : "Couldn't read the video response: network connection or TLS certificate error.",
        ),
      ),
    );
  });
}
