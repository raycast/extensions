import icy from "icy";
import type { IncomingMessage } from "node:http";
import { URL, urlToHttpOptions } from "node:url";
import { createLog } from "../lib/debug";
import { DEFAULT_TIMEOUT, head } from "./request";
import { searchRecording } from "./itunes";
const log = createLog("radio");

export async function getCurrentSong(url: string, signal?: AbortSignal): Promise<RecordingSummary | null> {
  log.log(`Fetching current song for ${url}`);

  return new Promise((resolve) => {
    let settled = false;
    let res: IncomingMessage | undefined;
    let metadataDeadline: NodeJS.Timeout | undefined;

    const clearMetadataDeadline = () => {
      if (metadataDeadline !== undefined) {
        clearTimeout(metadataDeadline);
        metadataDeadline = undefined;
      }
    };

    const close = () => {
      res?.destroy();
      req.destroy();
    };

    const settle = (value: RecordingSummary | null) => {
      if (settled) {
        return;
      }

      settled = true;
      clearMetadataDeadline();
      close();
      resolve(value);
    };

    metadataDeadline = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      clearMetadataDeadline();
      close();
      log.error("Failed to fetch current song: Metadata timeout");
      resolve(null);
    }, DEFAULT_TIMEOUT);

    const req = icy.get(
      {
        ...urlToHttpOptions(new URL(url)),
        signal,
        timeout: DEFAULT_TIMEOUT,
      },
      (response) => {
        res = response;

        response.on("metadata", (metadata) => {
          if (settled) {
            return;
          }

          clearMetadataDeadline();

          try {
            const parsed = icy.parse(metadata);

            if (parsed) {
              if (!parsed.StreamTitle.includes(" - ")) {
                settle(<RecordingSummary>{ title: parsed.StreamTitle });

                return;
              }

              const [artist, ...titleChunks] = parsed.StreamTitle.split(" - ");
              const title = titleChunks.join(" - ");

              // Close the ICY stream before the async cover-art lookup; we only need the first metadata event.
              settled = true;
              close();

              const fallback = <RecordingSummary>{ title, artist };

              searchRecording(title, artist, undefined, signal)
                .then((recording) => resolve(recording || fallback))
                .catch((error) => {
                  log.error(`Failed to look up recording: ${error.message}`);
                  resolve(fallback);
                });
            } else {
              log.error(`Failed to parse metadata: '${metadata}'`);
              settle(null);
            }
          } catch {
            log.error(`Failed to retrieve metadata: '${metadata}'`);
            settle(null);
          }
        });
      },
    );

    req.on("timeout", () => {
      if (settled) {
        return;
      }

      settled = true;
      clearMetadataDeadline();
      close();
      log.error("Failed to fetch current song: Request timeout");
      resolve(null);
    });

    req.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearMetadataDeadline();
      close();
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
