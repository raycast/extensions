import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { isSlackAuthenticationResponse } from "./downloadAuth";
import { expandDownloadDir, resolveUniquePath, sanitizeFilename } from "./downloadPaths";
import { getProxyAgent, getSlackToken } from "./WebClient";

const MAX_REDIRECTS = 5;
const HTML_AUTH_PREVIEW_BYTES = 8192;
const SIGN_IN_PAGE_ERROR =
  "Slack returned a sign-in page instead of the file. The token is likely missing the 'files:read' scope or lacks access to this file.";

export type DownloadResult = {
  /** Absolute path the file was written to. */
  path: string;
  /** Size of the downloaded file in bytes. */
  bytes: number;
};

function isSlackHost(hostname: string): boolean {
  return hostname === "slack.com" || hostname.endsWith(".slack.com");
}

/**
 * Performs a GET request following redirects. The Slack bearer token is only
 * attached to slack.com hosts; Slack frequently redirects `url_private_download`
 * to a signed URL on another host where forwarding the token would be unsafe.
 */
function requestWithRedirects(url: string, token: string, redirectsLeft = MAX_REDIRECTS): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`Invalid download URL: ${url}`));
      return;
    }

    const client = parsed.protocol === "http:" ? http : https;
    const agent = getProxyAgent();

    const request = client.get(
      parsed,
      {
        headers: isSlackHost(parsed.hostname) ? { Authorization: `Bearer ${token}` } : {},
        ...(agent ? { agent } : {}),
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          if (redirectsLeft <= 0) {
            reject(new Error("Too many redirects while downloading the file"));
            return;
          }
          const nextUrl = new URL(response.headers.location, parsed).toString();
          resolve(requestWithRedirects(nextUrl, token, redirectsLeft - 1));
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`Slack responded with HTTP ${status} while downloading the file`));
          return;
        }

        resolve(response);
      },
    );

    request.on("error", reject);
  });
}

function waitForReadable(stream: IncomingMessage): Promise<void> {
  if (stream.readableLength > 0 || stream.readableEnded) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReadable = () => {
      cleanup();
      resolve();
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      stream.off("readable", onReadable);
      stream.off("end", onEnd);
      stream.off("error", onError);
    };
    stream.once("readable", onReadable);
    stream.once("end", onEnd);
    stream.once("error", onError);
  });
}

async function readPrefix(stream: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  while (total < maxBytes) {
    if (stream.readableEnded) {
      break;
    }

    const chunk = stream.read(maxBytes - total) as Buffer | string | null;
    if (chunk == null) {
      await waitForReadable(stream);
      if (stream.readableEnded && stream.readableLength === 0) {
        break;
      }
      continue;
    }

    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    total += buffer.length;
  }

  return Buffer.concat(chunks);
}

function prependPrefix(prefix: Buffer, stream: IncomingMessage): Readable {
  if (prefix.length === 0) {
    return stream;
  }

  return Readable.from(
    (async function* () {
      yield prefix;
      yield* stream;
    })(),
  );
}

async function bodyAfterAuthenticationCheck(response: IncomingMessage): Promise<Readable> {
  const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.includes("text/html")) {
    return response;
  }

  // HTML files Slack serves as attachments are not sign-in pages; skip the peek.
  if (/\battachment\b/i.test(String(response.headers["content-disposition"] ?? ""))) {
    return response;
  }

  const prefix = await readPrefix(response, HTML_AUTH_PREVIEW_BYTES);
  if (isSlackAuthenticationResponse(response.headers, prefix.toString("utf8"))) {
    response.resume();
    throw new Error(SIGN_IN_PAGE_ERROR);
  }

  return prependPrefix(prefix, response);
}

/**
 * Downloads a Slack file from its `url_private`/`url_private_download` URL to a
 * local directory (default `~/Downloads`), authenticating with the active Slack
 * token. Returns the saved absolute path and byte size.
 */
export async function downloadSlackFile(params: {
  url: string;
  filename: string;
  destinationDir?: string;
}): Promise<DownloadResult> {
  const token = getSlackToken();
  if (!token) {
    throw new Error("No Slack token is available to authenticate the download");
  }

  const dir = expandDownloadDir(params.destinationDir);
  await mkdir(dir, { recursive: true });

  const response = await requestWithRedirects(params.url, token);
  const body = await bodyAfterAuthenticationCheck(response);

  // Reserve the destination exclusively so concurrent downloads of the same
  // name cannot overwrite each other. Only this path is cleaned up on failure.
  let ownedPath: string | undefined;
  try {
    ownedPath = await resolveUniquePath(dir, sanitizeFilename(params.filename));
    await pipeline(body, createWriteStream(ownedPath));
  } catch (error) {
    if (ownedPath !== undefined) {
      await rm(ownedPath, { force: true });
    }
    throw error;
  }

  const { size } = await stat(ownedPath);
  return { path: ownedPath, bytes: size };
}
