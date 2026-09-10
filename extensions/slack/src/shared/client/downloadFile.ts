import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { expandDownloadDir, resolveUniquePath, sanitizeFilename } from "./downloadPaths";
import { getProxyAgent, getSlackToken } from "./WebClient";

const MAX_REDIRECTS = 5;

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

  const targetPath = await resolveUniquePath(dir, sanitizeFilename(params.filename));
  const response = await requestWithRedirects(params.url, token);

  // Slack answers unauthorized/insufficient-scope requests with an HTML sign-in
  // page (HTTP 200), not the file bytes. Detect that so we fail loudly instead
  // of writing a bogus file to disk.
  const contentType = response.headers["content-type"] ?? "";
  if (contentType.includes("text/html")) {
    response.resume();
    throw new Error(
      "Slack returned a sign-in page instead of the file. The token is likely missing the 'files:read' scope or lacks access to this file.",
    );
  }

  try {
    await pipeline(response, createWriteStream(targetPath));
  } catch (error) {
    await rm(targetPath, { force: true });
    throw error;
  }

  const { size } = await stat(targetPath);
  return { path: targetPath, bytes: size };
}
