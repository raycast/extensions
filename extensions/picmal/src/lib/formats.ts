import { execFile } from "child_process";
import { promisify } from "util";
import { locateCli } from "./cli";

const execFileAsync = promisify(execFile);

/** Supported output formats grouped by media category. */
export interface FormatGroups {
  image: string[];
  audio: string[];
  video: string[];
  document: string[];
}

/** A media category an input file or output format belongs to. */
export type MediaCategory = keyof FormatGroups;

/**
 * The root media kind a category belongs to. Documents fold into `image`
 * (ImageMagick handles both), so a single target format / preset can only ever
 * serve one root — `image`, `audio`, or `video`.
 */
export type MediaRoot = "image" | "audio" | "video";

/** Collapse selected categories to their root kinds (document → image). */
export function mediaRoots(cats: Set<MediaCategory>): Set<MediaRoot> {
  const roots = new Set<MediaRoot>();
  for (const cat of cats) roots.add(cat === "audio" ? "audio" : cat === "video" ? "video" : "image");
  return roots;
}

/** "image", "image and video", "image, audio and video". */
export function humanJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const EMPTY: FormatGroups = { image: [], audio: [], video: [], document: [] };

/** Classify a file path into a media category by its extension, or undefined. */
export function categorize(path: string, formats: FormatGroups): MediaCategory | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;
  if (formats.image.includes(ext)) return "image";
  if (formats.audio.includes(ext)) return "audio";
  if (formats.video.includes(ext)) return "video";
  if (formats.document.includes(ext)) return "document";
  return undefined;
}

/** The set of media categories present in a list of selected files. */
export function selectedCategories(paths: string[], formats: FormatGroups): Set<MediaCategory> {
  const set = new Set<MediaCategory>();
  for (const path of paths) {
    const category = categorize(path, formats);
    if (category) set.add(category);
  }
  return set;
}

/**
 * Which target categories make sense to convert the given inputs into.
 * Returns `null` when there's nothing to filter on (show everything).
 * - image / document → image + document (ImageMagick handles both)
 * - audio → audio
 * - video → video + audio (allow extracting the audio track)
 */
export function targetCategories(inputCategories: Set<MediaCategory>): Set<MediaCategory> | null {
  if (inputCategories.size === 0) return null;
  const out = new Set<MediaCategory>();
  for (const category of inputCategories) {
    if (category === "audio") {
      out.add("audio");
    } else if (category === "video") {
      out.add("video");
      out.add("audio");
    } else {
      out.add("image");
      out.add("document");
    }
  }
  return out;
}

/**
 * Fetch supported formats via `picmal-cli formats --json`. The command emits a
 * single `completed` NDJSON line with a `formats` object. Returns empty groups
 * if the CLI can't be reached or parsed (callers degrade to a free-text field).
 */
export async function loadFormats(): Promise<FormatGroups> {
  let cli: string;
  try {
    cli = locateCli();
  } catch {
    return EMPTY;
  }

  try {
    const { stdout } = await execFileAsync(cli, ["formats", "--json"], { encoding: "utf8" });
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      const event = JSON.parse(trimmed) as { event?: string; formats?: Partial<FormatGroups> };
      if (event.event === "completed" && event.formats) {
        return {
          image: event.formats.image ?? [],
          audio: event.formats.audio ?? [],
          video: event.formats.video ?? [],
          document: event.formats.document ?? [],
        };
      }
    }
  } catch {
    // fall through to EMPTY
  }
  return EMPTY;
}
