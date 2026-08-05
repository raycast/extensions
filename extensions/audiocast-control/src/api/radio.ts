import icy from "icy";
import { URL, urlToHttpOptions } from "node:url";
import { createLog } from "../lib/debug";
import { DEFAULT_TIMEOUT, head } from "./request";
import { searchRecording } from "./itunes";
const log = createLog("radio");

export async function getCurrentSong(url: string, signal?: AbortSignal): Promise<RecordingSummary | null> {
  log.log(`Fetching current song for ${url}`);

  return new Promise((resolve) => {
    let settled = false;

    const req = icy.get(
      {
        ...urlToHttpOptions(new URL(url)),
        signal,
        timeout: DEFAULT_TIMEOUT,
      },
      (res) => {
        const close = () => {
          res.destroy();
          req.destroy();
        };

        res.on("metadata", (metadata) => {
          if (settled) {
            return;
          }

          try {
            const parsed = icy.parse(metadata);

            if (parsed) {
              if (!parsed.StreamTitle.includes(" - ")) {
                settled = true;
                close();
                resolve(<RecordingSummary>{ title: parsed.StreamTitle });

                return;
              }

              const [artist, ...titleChunks] = parsed.StreamTitle.split(" - ");
              const title = titleChunks.join(" - ");

              // Close the ICY stream before the async cover-art lookup; we only need the first metadata event.
              settled = true;
              close();

              searchRecording(title, artist).then((recording) =>
                resolve(recording || <RecordingSummary>{ title, artist }),
              );
            } else {
              log.error(`Failed to parse metadata: '${metadata}'`);
              settled = true;
              close();
              resolve(null);
            }
          } catch {
            log.error(`Failed to retrieve metadata: '${metadata}'`);
            settled = true;
            close();
            resolve(null);
          }
        });
      },
    );

    req.on("timeout", () => {
      if (settled) {
        return;
      }

      settled = true;
      req.destroy();
      log.error("Failed to fetch current song: Request timeout");
      resolve(null);
    });

    req.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      log.error(`Failed to fetch current song: ${error.message}`);
      resolve(null);
    });
  });
}

export interface RadioData {
  /**
   * Radio station name.
   */
  title: string;
  /**
   * Description
   */
  description: string;
}

export async function getData(url: string, signal?: AbortSignal): Promise<RadioData> {
  log.log(`[getData] Fetching radio data: ${url}`);

  const { headers } = await head(url, undefined, { signal });

  log.log("[getData] Received data:", headers);
  const { "icy-name": name, "icy-description": description, "icy-br": bitrate, "icy-genre": genre } = headers;

  return {
    title: `${name || ""}`,
    description: `${description ? `${description} ` : ""}${genre ? `<${genre}> ` : ""}${
      bitrate ? `[${bitrate}kbps]` : ""
    }`,
  };
}
