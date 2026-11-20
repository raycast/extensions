import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedFinderItems,
  open,
  showHUD,
  showInFinder,
} from "@raycast/api";
import { extname } from "node:path";
import { run, STORE_URL, summarize, ToolboxError } from "./toolbox";

export const VIDEO = ["mp4", "mov", "m4v", "mkv", "webm", "avi", "wmv", "flv", "mpg", "mpeg", "3gp", "ts", "mts"];
export const IMAGE = [
  "jpg",
  "jpeg",
  "png",
  "heic",
  "heif",
  "webp",
  "gif",
  "tif",
  "tiff",
  "bmp",
  "psd",
  "avif",
  "dng",
  "cr2",
  "cr3",
  "nef",
  "arw",
  "raf",
  "orf",
  "rw2",
];
export const PDF = ["pdf"];
export const AUDIO = ["mp3", "m4a", "wav", "aac", "flac", "ogg", "opus", "aif", "aiff", "wma", "caf"];

interface QuickOptions {
  /** Toolbox tool name, e.g. compress_video. */
  tool: string;
  /** File extensions this tool accepts; other selected files are skipped. */
  accept: string[];
  /** Plural noun for messages, e.g. "videos". */
  noun: string;
  /** "Compressing" → "Compressing 3 videos…" */
  doing: string;
  /** "Compressed" → "✓ Compressed 3 videos" */
  done: string;
  args?: string[];
  /** Copy the result's text instead of saving files (Extract Text, Transcribe). */
  copyText?: boolean;
  minFiles?: number;
}

/** Runs a tool on the files selected in Finder, reporting progress and the result as HUDs. */
export async function runOnFinderSelection(options: QuickOptions) {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    await showHUD(`Select ${options.noun} in Finder first`);
    return;
  }
  const files = paths.filter((path) => options.accept.includes(extname(path).slice(1).toLowerCase()));
  const minimum = options.minFiles ?? 1;
  if (files.length < minimum) {
    await showHUD(
      minimum > 1 ? `Select at least ${minimum} ${options.noun} in Finder` : `Select ${options.noun} in Finder first`,
    );
    return;
  }
  const skipped = paths.length - files.length;
  await closeMainWindow();
  await showHUD(`${options.doing} ${count(files.length, options.noun)}…`);
  try {
    const result = await run(options.tool, [...files, ...(options.args ?? [])]);
    const note = skipped ? ` (skipped ${skipped} other file${skipped === 1 ? "" : "s"})` : "";
    if (options.copyText) {
      const text = (result.text ?? "").trim();
      if (!text) {
        await showHUD(`No text found${note}`);
        return;
      }
      await Clipboard.copy(text);
      await showHUD(`✓ Copied ${text.length.toLocaleString()} characters${note}`);
      return;
    }
    await showHUD(`✓ ${options.done} ${summarize(result)}${note}`);
    const { afterRun } = getPreferenceValues<Preferences>();
    if (afterRun === "reveal" && result.outputs[0]) await showInFinder(result.outputs[0].path);
  } catch (error) {
    await reportError(error);
  }
}

export async function reportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof ToolboxError && error.kind === "missing") await open(STORE_URL);
  await showHUD(`✗ ${message}`);
}

const count = (n: number, noun: string) => (n === 1 ? `1 ${noun.replace(/s$/, "")}` : `${n} ${noun}`);
