// Turns what the user gave into a fabric Input (ISC-15): a YouTube URL goes
// to -y, any other URL to -u, text is piped, an image is attached with -a,
// audio and video go to --transcribe-file. Pure apart from reading a text file.

import { readFileSync, realpathSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { type Input, isSpotifyUrl } from "./argv";
import { isSingleUrl } from "./input";

const YOUTUBE = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const IMAGE = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const MEDIA = new Set([
  ".mp3",
  ".m4a",
  ".wav",
  ".flac",
  ".aac",
  ".ogg",
  ".mpga",
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".mkv",
  ".mpeg",
]);
const MAX_TEXT_BYTES = 10 * 1024 * 1024;

export class ClassifyError extends Error {}

export function classifyText(text: string): Input {
  if (isSingleUrl(text)) {
    const url = text.trim();
    if (isSpotifyUrl(url)) return { kind: "spotify", url };
    return YOUTUBE.has(new URL(url).hostname.toLowerCase()) ? { kind: "youtube", url } : { kind: "url", url };
  }
  return { kind: "text", text };
}

const SECRETS_NAME = /^\.env(\..*)?$/i;
// A dotenv line holding a real-looking key (`OPENAI_API_KEY=sk-…`): catches a copy of a .env
// under any name. Dotenv form only (no spaces around `=`, value 16+ chars, not a number or
// a placeholder), so `MAX_TOKENS = 4096` in code or `export X_API_KEY=your-key` in a README passes.
const SECRETS_LINE =
  /^(export )?[A-Z][A-Z0-9_]*(API_KEY|_TOKEN|_SECRET|ACCESS_KEY)[A-Z0-9_]*=["']?(?!your|<|xxx|\$|changeme)[A-Za-z0-9_\-.+/:]{16,}["']?[ \t]*$/m;
const SECRETS = "That looks like a secrets file (.env); it is never sent.";

export function classifyFile(given: string): Input {
  // Never send a secrets file to a model, fabric's own .env included (ISC-7).
  // The name is checked before and after following symlinks.
  if (SECRETS_NAME.test(basename(given))) throw new ClassifyError(SECRETS);
  const path = realpathSync(given);
  if (SECRETS_NAME.test(basename(path))) throw new ClassifyError(SECRETS);
  const st = statSync(path);
  // A hard link (to a .env, say) has no telltale name, so it is refused before anything reads it.
  if (st.nlink > 1) throw new ClassifyError("That file is hard-linked elsewhere; copy it to a plain file first.");
  const ext = extname(path).toLowerCase();
  if (IMAGE.has(ext) || MEDIA.has(ext)) return IMAGE.has(ext) ? { kind: "image", path } : { kind: "media", path };
  if (ext === ".pdf") throw new ClassifyError("fabric can't read PDFs directly. Copy the text out first.");
  if (st.size > MAX_TEXT_BYTES) throw new ClassifyError("That file is over 10 MB, too big to send as text.");
  const buf = readFileSync(path);
  if (buf.includes(0)) throw new ClassifyError("That file isn't text, an image, audio or video.");
  const text = buf.toString("utf8");
  if (SECRETS_LINE.test(text)) throw new ClassifyError(SECRETS);
  return { kind: "text", text };
}

/** Shown under the input field: "Detected: YouTube video." */
export function describeInput(input: Input): string {
  return {
    none: "Nothing yet",
    text: "Text",
    youtube: "YouTube video",
    url: "Web page",
    spotify: "Spotify episode or show (metadata only; fabric doesn't fetch the audio)",
    image: "Image",
    media: "Audio or video (transcribed first)",
  }[input.kind];
}

/**
 * Web pages, YouTube and audio/video take a while; they default to a background run. A web page
 * joined: a foreground run on one outlasted the view and was lost when Raycast closed it.
 */
export const isLong = (input: Input) => input.kind === "url" || input.kind === "youtube" || input.kind === "media";

const LINK_KIND: Partial<Record<Input["kind"], string>> = {
  url: "Web page",
  youtube: "YouTube video",
  spotify: "Spotify link",
};

/** The Result's and a background record's Input: a link says what it is ahead of where it came from. */
export function inputLabel(origin: string, input: Input): string {
  const kind = LINK_KIND[input.kind];
  return kind ? `${kind} · ${origin}` : origin;
}
