import axios from "axios";
import { createHash } from "node:crypto";
import { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { mkdir, mkdtemp, open, rename, rmdir, unlink } from "node:fs/promises";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { isIP, LookupFunction } from "node:net";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { sourceUrl } from "./ai-library";

const MAX_ASSET_BYTES = 100 * 1024 * 1024;
const DOWNLOAD_DEADLINE_MS = 60_000;
export type DownloadedAsset = { url: string; path: string; size: number; sha256: string };
export type RemoteOptions = {
  resolve?: (hostname: string) => Promise<LookupAddress[]>;
  maxBytes?: number;
  deadlineMs?: number;
};

export function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  return isIP(address) === 6 && /^[23]/i.test(address) && !/^2001:db8:/i.test(address);
}

export function isHtml(content: Buffer) {
  return /<!doctype\s+html|<html(?:\s|>)/i.test(content.toString("utf8"));
}

async function publicTarget(value: string, resolve: NonNullable<RemoteOptions["resolve"]>) {
  sourceUrl(value);
  const url = new URL(value);
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("assetUrl must use a public HTTP(S) port.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolve(hostname);
  if (
    !addresses.length ||
    addresses.some(({ address, family }) => !isPublicAddress(address) || isIP(address) !== family)
  ) {
    throw new Error("assetUrl must point to a public direct asset, not a local or private server.");
  }
  // Keep the validated address values, never a resolver that can return a new answer.
  const pinned = addresses.map(({ address, family }) => ({ address, family }));
  const pinnedLookup: LookupFunction = (requestedHost, options, callback) => {
    const choices = pinned.filter((entry) => !options.family || entry.family === options.family);
    if (requestedHost !== hostname || !choices.length) {
      callback(new Error("The asset connection does not match its validated address."), "");
    } else if (options.all) {
      callback(null, choices);
    } else {
      callback(null, choices[0].address, choices[0].family);
    }
  };
  return { url, pinnedLookup };
}

async function readRemote<T>(
  value: string,
  consume: (stream: Readable, url: URL, contentType: string, disposition: string) => Promise<T>,
  options: RemoteOptions,
  previewOnly = false,
) {
  const deadlineMs = options.deadlineMs ?? (previewOnly ? 15_000 : DOWNLOAD_DEADLINE_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("The asset download deadline expired.")), {
      once: true,
    });
  });
  const resolve = options.resolve || ((hostname: string) => lookup(hostname, { all: true }));
  let current = value;
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      const target = await Promise.race([publicTarget(current, resolve), aborted]);
      if (controller.signal.aborted) throw new Error("The asset download deadline expired.");
      const httpAgent = new HttpAgent({ keepAlive: false, lookup: target.pinnedLookup });
      const httpsAgent = new HttpsAgent({ keepAlive: false, lookup: target.pinnedLookup });
      let stream: Readable | undefined;
      try {
        const response = await axios.get<Readable>(target.url.href, {
          adapter: "http",
          httpAgent,
          httpsAgent,
          proxy: false,
          maxRedirects: 0,
          responseType: "stream",
          signal: controller.signal,
          timeout: Math.min(deadlineMs, 15_000),
          maxContentLength: options.maxBytes ?? MAX_ASSET_BYTES,
          headers: previewOnly ? { Range: "bytes=0-1023" } : undefined,
          validateStatus: () => true,
        });
        stream = response.data;
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (!response.headers.location || redirects === 5) throw new Error("Too many asset redirects.");
          current = new URL(response.headers.location, target.url).href;
          continue;
        }
        if (response.status < 200 || response.status >= 300 || (!previewOnly && response.status === 206)) {
          throw new Error("The asset URL is not publicly downloadable as a complete file.");
        }
        const contentType = String(response.headers["content-type"] || "")
          .toLowerCase()
          .split(";")[0]
          .trim();
        if (!contentType || /text\/html|application\/xhtml/.test(contentType)) {
          throw new Error("The URL is an HTML webpage or has no asset content type. Supply a public direct asset URL.");
        }
        return await consume(stream, target.url, contentType, String(response.headers["content-disposition"] || ""));
      } finally {
        stream?.destroy();
        httpAgent.destroy();
        httpsAgent.destroy();
      }
    }
    throw new Error("Too many asset redirects.");
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Inspect without retaining files, including when a confirmation is declined. */
export async function inspectRemoteAsset(value: string, options: RemoteOptions = {}): Promise<string> {
  return readRemote(
    value,
    async (stream, url) => {
      let preview = Buffer.alloc(0);
      for await (const chunk of stream) {
        preview = Buffer.concat([preview, Buffer.from(chunk).subarray(0, 1024 - preview.length)]);
        if (preview.length >= 1024) break;
      }
      if (!preview.length || isHtml(preview)) throw new Error("The URL returned empty content or an HTML webpage.");
      return url.href;
    },
    options,
    true,
  );
}

function assetExtension(url: URL, contentType: string, disposition: string) {
  const types: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "image/tiff": ".tiff",
    "image/x-icon": ".ico",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/json": ".json",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "text/plain": ".txt",
    "text/css": ".css",
  };
  if (types[contentType]) return types[contentType];
  const filename = /filename\*?\s*=\s*(?:UTF-8''|["']?)([^;"']+)/i.exec(disposition)?.[1] || url.pathname;
  let extension = "";
  try {
    extension = extname(basename(decodeURIComponent(filename))).toLowerCase();
  } catch {
    /* Use a safe fallback. */
  }
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ".bin";
}

/** Download once into private owned storage; Eagle receives only this local file. */
export async function downloadRemoteAsset(
  value: string,
  supportPath: string,
  options: RemoteOptions = {},
): Promise<DownloadedAsset> {
  const root = join(supportPath, "ai-import-staging");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(root, "asset-"));
  const temporary = join(directory, "download.part");
  try {
    return await readRemote(
      value,
      async (stream, url, contentType, disposition) => {
        const handle = await open(temporary, "wx", 0o600);
        const hash = createHash("sha256");
        let size = 0;
        let preview = Buffer.alloc(0);
        try {
          for await (const chunk of stream) {
            const bytes = Buffer.from(chunk);
            size += bytes.length;
            if (size > (options.maxBytes ?? MAX_ASSET_BYTES))
              throw new Error("The remote asset exceeds the 100 MiB download limit.");
            if (preview.length < 1024) preview = Buffer.concat([preview, bytes.subarray(0, 1024 - preview.length)]);
            hash.update(bytes);
            await handle.writeFile(bytes);
          }
          if (!size || isHtml(preview)) throw new Error("The URL returned empty content or an HTML webpage.");
          await handle.sync();
        } finally {
          await handle.close();
        }
        const path = join(directory, `asset${assetExtension(url, contentType, disposition)}`);
        await rename(temporary, path);
        return { url: url.href, path, size, sha256: hash.digest("hex") };
      },
      options,
    );
  } catch (error) {
    await unlink(temporary).catch((failure: NodeJS.ErrnoException) => {
      if (failure.code !== "ENOENT") throw failure;
    });
    await rmdir(directory);
    throw error;
  }
}
