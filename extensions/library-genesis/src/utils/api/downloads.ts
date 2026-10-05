import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { link, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Agent } from "undici";

import { getUrlFromDownloadPage } from ".";
import { mirror } from "./mirrors";
import { LIBGEN_USER_AGENT } from "./request";

type DownloadOptions = {
  referer: string;
  extension: string;
  md5?: string;
  signal?: AbortSignal;
  allowIgnoreHTTPSErrors?: boolean;
  timeoutMs?: number;
};

const validateFile = (prefix: Buffer, extension: string) => {
  if (!prefix.length) throw new Error("The server returned an empty book file.");
  const text = prefix
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/^<(?:!doctype\s+html|html\b|head\b|body\b|title\b|div\b|h1\b)/i.test(text)) {
    throw new Error("The server returned an HTML page instead of a book.");
  }
  if (extension.toLowerCase() === "epub" && !prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    throw new Error("The server did not return an EPUB file.");
  }
  if (extension.toLowerCase() === "pdf" && !prefix.includes(Buffer.from("%PDF-"))) {
    throw new Error("The server did not return a PDF file.");
  }
};

// Publish the final filename only after the entire response has been validated.
export async function downloadBookFile(url: string, destination: string, options: DownloadOptions): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 300000);
  const temporary = join(dirname(destination), `.libgen-${randomUUID()}.part`);
  const dispatcher = options.allowIgnoreHTTPSErrors ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;

  try {
    controller.signal.throwIfAborted();
    const response = await fetch(url, {
      headers: { "User-Agent": LIBGEN_USER_AGENT, Referer: options.referer },
      signal: controller.signal,
      // Node's bundled Undici types can differ from the installed Agent types.
      ...(dispatcher && {
        dispatcher: dispatcher as unknown as NonNullable<Parameters<typeof fetch>[1]>["dispatcher"],
      }),
    });
    if (!response.ok || /(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get("content-type") ?? "")) {
      await response.body?.cancel();
      throw new Error(
        !response.ok
          ? `The download server returned HTTP ${response.status}.`
          : "The server returned an HTML page instead of a book.",
      );
    }
    if (!response.body) throw new Error("The server returned an empty book file.");

    const hash = createHash("md5");
    const reader = response.body.getReader();
    let bytes = 0;
    async function* chunks() {
      let prefix = Buffer.alloc(0);
      let validated = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = Buffer.from(value);
          bytes += chunk.length;
          hash.update(chunk);
          if (validated) {
            yield chunk;
          } else {
            const remaining = 1024 - prefix.length;
            prefix = Buffer.concat([prefix, chunk.subarray(0, remaining)]);
            if (prefix.length === 1024) {
              validateFile(prefix, options.extension);
              validated = true;
              yield prefix;
              if (chunk.length > remaining) yield chunk.subarray(remaining);
            }
          }
        }
        if (!validated) {
          validateFile(prefix, options.extension);
          yield prefix;
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
    await pipeline(chunks(), createWriteStream(temporary, { flags: "wx" }), { signal: controller.signal });
    const length = response.headers.get("content-length");
    if (length && !response.headers.get("content-encoding") && bytes !== Number(length)) {
      throw new Error("The book download was incomplete.");
    }
    const actualMd5 = hash.digest("hex");
    if (options.md5 && /^[a-f0-9]{32}$/i.test(options.md5) && actualMd5 !== options.md5.toLowerCase()) {
      throw new Error("The downloaded file does not match the book's checksum.");
    }
    controller.signal.throwIfAborted();
    // link is atomic and refuses to overwrite an existing book.
    await link(temporary, destination);
  } catch (error) {
    if (timedOut && !options.signal?.aborted) throw new Error("The book download timed out. Try another mirror.");
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
    await dispatcher?.destroy();
    await rm(temporary, { force: true });
  }
}

export async function downloadBookFromMirrors(
  downloadPage: string,
  destination: string,
  options: Omit<DownloadOptions, "referer">,
): Promise<void> {
  const page = new URL(downloadPage);
  const failedMirrors: string[] = [];
  let lastError: unknown;
  while (true) {
    options.signal?.throwIfAborted();
    try {
      const url = await getUrlFromDownloadPage(page.toString(), options.signal);
      await downloadBookFile(url, destination, { ...options, referer: page.toString() });
      return;
    } catch (error) {
      options.signal?.throwIfAborted();
      // Local filesystem failures cannot be repaired by selecting another mirror.
      if (
        ["EACCES", "EPERM", "ENOSPC", "EEXIST", "ENOENT", "EROFS"].includes((error as NodeJS.ErrnoException).code ?? "")
      ) {
        throw error;
      }
      lastError = error;
    }
    failedMirrors.push(page.origin);
    // Only the modern ads.php route can be transferred safely between aliases.
    if (page.pathname !== "/ads.php" || !/^[a-f0-9]{32}$/i.test(page.searchParams.get("md5") ?? "")) break;
    const next = await mirror(options.signal, failedMirrors);
    options.signal?.throwIfAborted();
    if (!next) break;
    page.host = new URL(next).host;
    page.protocol = new URL(next).protocol;
  }
  const error = lastError as Error & { cause?: { code?: string } };
  const detail = error.message === "fetch failed" && error.cause?.code ? error.cause.code : error.message;
  throw new Error(`Download failed after trying ${failedMirrors.length} mirror(s): ${detail}`, { cause: lastError });
}
