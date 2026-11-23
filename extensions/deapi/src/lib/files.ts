import { getPreferenceValues } from "@raycast/api";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { DeapiClient } from "./api";
import type { JobKind } from "./history";

export function getClient(): DeapiClient {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new DeapiClient(apiKey.trim());
}

/** The folder chosen in the preferences, or Downloads when none is set. */
export function outputDirectory(): string {
  const { outputDirectory } = getPreferenceValues<Preferences>();
  return outputDirectory?.trim() ? outputDirectory : join(homedir(), "Downloads");
}

/** Creates the output folder if needed. Fails loudly instead of saving somewhere else. */
async function ensureOutputDirectory(): Promise<string> {
  const directory = outputDirectory();
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not use the output folder ${directory} (${reason}). Choose another folder in the deAPI extension preferences.`,
    );
  }
  return directory;
}

const DEFAULT_EXTENSIONS: Record<JobKind, string> = {
  image: "png",
  edit: "png",
  background: "png",
  upscale: "png",
  video: "mp4",
  speech: "mp3",
  transcription: "txt",
};

const EXTENSIONS_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/** Downloads a job result into the output folder and returns the file path. */
export async function downloadResult(url: string, kind: JobKind, requestId: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the result (HTTP ${response.status}).`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  const fromUrl = new URL(url).pathname.split(".").pop()?.toLowerCase();
  const extension =
    EXTENSIONS_BY_TYPE[contentType] ??
    (fromUrl && /^[a-z0-9]{2,4}$/.test(fromUrl) ? fromUrl : DEFAULT_EXTENSIONS[kind]);

  const directory = await ensureOutputDirectory();
  const path = uniquePath(directory, `deapi-${kind}-${requestId.slice(0, 8)}`, extension);
  await pipeline(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream), createWriteStream(path));
  return path;
}

function uniquePath(directory: string, name: string, extension: string): string {
  let path = join(directory, `${name}.${extension}`);
  for (let index = 2; existsSync(path); index++) {
    path = join(directory, `${name}-${index}.${extension}`);
  }
  return path;
}

/** Markdown for an image that Raycast shows in a Detail view. */
export function imageMarkdown(source: string, alt = "Result"): string {
  const url = source.startsWith("http") ? source : pathToFileURL(source).href;
  return `![${alt.replace(/[[\]]/g, "")}](${url}?raycast-height=350)`;
}
