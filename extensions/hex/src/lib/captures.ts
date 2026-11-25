import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import { hex, HexError } from "./hex";
import { Annotation, AnnotationListReply, SettingsReply } from "./types";

const execFileAsync = promisify(execFile);

export type CaptureKind = "screenshot" | "recording" | "annotation";

export type Capture = {
  id: string;
  kind: CaptureKind;
  path: string;
  createdAt: Date;
  thumbnail?: string;
  video?: string;
  summary?: string;
  annotation?: Annotation;
};

const SCREENSHOT = /^Hex Screenshot .+\.png$/;
const RECORDING = /^Hex Recording .+\.mp4$/;

async function screenshotFolder(): Promise<string> {
  const reply = await hex<SettingsReply>(["settings", "get", "screenshots.folder"]);
  const value = reply.settings.find((setting) => setting.key === "screenshots.folder")?.value;
  return typeof value === "string" && value ? value : join(homedir(), "Desktop");
}

const thumbnailDir = () => join(environment.supportPath, "thumbnails");

async function videoThumbnail(path: string, mtimeMs: number): Promise<string | undefined> {
  const dir = thumbnailDir();
  const key = createHash("sha1").update(`${path}\0${mtimeMs}`).digest("hex");
  const out = join(dir, `${key}.png`);
  if (existsSync(out)) return out;
  await mkdir(dir, { recursive: true });
  const scratch = await mkdtemp(join(dir, "ql-"));
  try {
    await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", "640", "-o", scratch, path], {
      timeout: 10_000,
    });
    const produced = join(scratch, `${basename(path)}.png`);
    if (existsSync(produced)) await rename(produced, out);
  } catch {
    return undefined;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  return existsSync(out) ? out : undefined;
}

async function mapWithLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const MAX_CONCURRENT_THUMBNAILS = 4;

async function folderCaptures(): Promise<Capture[]> {
  const folder = await screenshotFolder();
  const names = (await readdir(folder)).filter((name) => SCREENSHOT.test(name) || RECORDING.test(name));
  const stats = await Promise.allSettled(
    names.map(async (name) => {
      const path = join(folder, name);
      return { name, path, info: await stat(path) };
    }),
  );
  const files = stats.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const captures = await mapWithLimit(
    files,
    MAX_CONCURRENT_THUMBNAILS,
    async ({ name, path, info }): Promise<Capture> => {
      const kind = SCREENSHOT.test(name) ? "screenshot" : "recording";
      return {
        id: path,
        kind,
        path,
        createdAt: info.birthtime,
        thumbnail: kind === "screenshot" ? path : await videoThumbnail(path, info.mtimeMs),
      };
    },
  );
  await pruneThumbnails(
    new Set(
      captures.flatMap((capture) => (capture.kind === "recording" && capture.thumbnail ? [capture.thumbnail] : [])),
    ),
  );
  return captures;
}

async function pruneThumbnails(keep: Set<string>) {
  const dir = thumbnailDir();
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names
      .map((name) => join(dir, name))
      .filter((path) => path.endsWith(".png") && !keep.has(path))
      .map((path) => rm(path, { force: true }).catch(() => undefined)),
  );
}

function firstExisting(...paths: string[]): string | undefined {
  return paths.find((path) => existsSync(path));
}

const ANNOTATE_UNAVAILABLE = new Set(["unsupported", "feature-off", "disabled"]);

async function annotationCaptures(): Promise<Capture[]> {
  let reply: AnnotationListReply;
  try {
    reply = await hex<AnnotationListReply>(["annotate", "list", "--limit", "200"]);
  } catch (error) {
    if (error instanceof HexError && ANNOTATE_UNAVAILABLE.has(error.code)) {
      return [];
    }
    throw error;
  }
  return reply.captures.map((annotation) => ({
    id: annotation.bundle,
    kind: "annotation",
    path: annotation.bundle,
    createdAt: new Date(annotation.created_at_ms),
    thumbnail: firstExisting(
      join(annotation.bundle, "contact-sheet.png"),
      join(annotation.bundle, "frames", "frame-01.png"),
    ),
    video: firstExisting(join(annotation.bundle, "recording.mp4")),
    summary: firstExisting(join(annotation.bundle, "summary.md")),
    annotation,
  }));
}

type CaptureLoad = {
  captures: Capture[];
  failures: { source: string; error: unknown }[];
};

export async function loadCaptures(): Promise<CaptureLoad> {
  const sources = [
    { source: "screenshots and screen recordings", load: folderCaptures },
    { source: "annotations", load: annotationCaptures },
  ];
  const results = await Promise.allSettled(sources.map(({ load }) => load()));
  const captures: Capture[] = [];
  const failures: CaptureLoad["failures"] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") captures.push(...result.value);
    else failures.push({ source: sources[index].source, error: result.reason });
  });
  if (failures.length === sources.length) throw failures[0].error;
  captures.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { captures, failures };
}
