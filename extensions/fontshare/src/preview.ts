import { environment } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Font, FontPair } from "./api";
import { renderPairSvg, renderSampleSvg, renderTextSvg } from "./render-svg";

// Blank image shown while a preview renders: built-in icons would fill the whole grid cell.
export const PREVIEW_PLACEHOLDER = "preview-placeholder.svg";

const CONCURRENCY = 6;
// Bump when the rendering changes so stale images are regenerated.
const RENDER_VERSION = 6;
// Raycast grids scale images so that only their top-left 90% fills the cell (measured with a calibration image),
// which crops the right and bottom edges. Previews add a matching transparent margin there.
const GRID_VISIBLE_FRACTION = 0.9;

export interface RenderedImages {
  // Grid-ready SVG (with the grid margin) of each rendered job.
  files: Record<string, string>;
  // Ids whose rendering failed (e.g. offline); `retry` tries them again.
  failed: string[];
  // True while some images are still being rendered for the first time.
  isRendering: boolean;
  retry: () => void;
}

interface RenderJob {
  id: string;
  // Cache file name without extension: "<name>.svg" is the drawing, "<name>.grid.svg" its grid-ready copy.
  name: string;
  render: () => Promise<string>;
}

function cacheDir(cache: string): string {
  return join(environment.supportPath, `${cache}-v${RENDER_VERSION}`);
}

async function removeStaleCaches(cache: string): Promise<void> {
  const current = `${cache}-v${RENDER_VERSION}`;
  const entries = await readdir(environment.supportPath).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(cache) && entry !== current)
      .map((entry) => rm(join(environment.supportPath, entry), { recursive: true, force: true })),
  );
}

/** Extends the SVG canvas to the right and bottom so the drawing exactly fills a Raycast grid cell. */
function fitGridCell(svg: string): string {
  return svg.replace(/<svg ([^>]*)>/, (_, attributes: string) => {
    const scaled = attributes
      .replace(/viewBox="([^"]+)"/, (_, viewBox: string) => {
        const [x, y, width, height] = viewBox.split(" ").map(Number);
        const size = [width, height].map((n) => (n / GRID_VISIBLE_FRACTION).toFixed(2));
        return `viewBox="${x} ${y} ${size.join(" ")}"`;
      })
      .replace(/(width|height)="([^"]+)"/g, (_, name: string, value: string) => {
        return `${name}="${(Number(value) / GRID_VISIBLE_FRACTION).toFixed(2)}"`;
      });
    return `<svg ${scaled}>`;
  });
}

// Pairs reuse the same font files, so share downloads within a session.
const fontData = new Map<string, Promise<ArrayBuffer>>();

function fetchFontData(url: string): Promise<ArrayBuffer> {
  let data = fontData.get(url);
  if (!data) {
    data = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Font file responded with ${response.status}`);
      return response.arrayBuffer();
    });
    data.catch(() => fontData.delete(url));
    fontData.set(url, data);
  }
  return data;
}

// Writes through a unique temporary file, then renames, so a cancelled or concurrent write never leaves a truncated
// file and two writers never share a temporary path.
async function writeAtomically(file: string, content: string): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, file);
}

// The grid and a detail view can request the same image at once; share one render per cache file.
const inFlight = new Map<string, Promise<void>>();

function renderToCache(dir: string, job: RenderJob, gridFile: string): Promise<void> {
  let rendering = inFlight.get(gridFile);
  if (!rendering) {
    rendering = (async () => {
      const svg = await job.render();
      await mkdir(dir, { recursive: true });
      // The plain drawing is written first so the grid file's existence implies both are ready.
      await writeAtomically(join(dir, `${job.name}.svg`), svg);
      await writeAtomically(gridFile, fitGridCell(svg));
    })().finally(() => inFlight.delete(gridFile));
    inFlight.set(gridFile, rendering);
  }
  return rendering;
}

/** Returns the cached grid SVG path of each job, rendering missing ones in the background. */
function useRenderedImages(cache: string, jobs: RenderJob[] | undefined): RenderedImages {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  useEffect(() => {
    if (!jobs) {
      return;
    }

    let cancelled = false;
    const dir = cacheDir(cache);
    const cached: Record<string, string> = {};
    const queue: (RenderJob & { file: string })[] = [];

    for (const job of jobs) {
      const file = join(dir, `${job.name}.grid.svg`);
      if (existsSync(file)) {
        cached[job.id] = file;
      } else {
        queue.push({ ...job, file });
      }
    }
    setFiles(cached);
    setFailed([]);
    setPending(queue.length);
    removeStaleCaches(cache).catch((error) => console.error(`Could not remove stale ${cache}`, error));

    const worker = async () => {
      for (let job = queue.shift(); job && !cancelled; job = queue.shift()) {
        const { id, file } = job;
        try {
          await renderToCache(dir, job, file);
          if (!cancelled) setFiles((current) => ({ ...current, [id]: file }));
        } catch (error) {
          console.error(`Could not render ${cache} image ${id}`, error);
          if (!cancelled) setFailed((current) => [...current, id]);
        }
        if (!cancelled) setPending((count) => count - 1);
      }
    };
    Promise.all(Array.from({ length: CONCURRENCY }, worker));

    return () => {
      cancelled = true;
    };
  }, [cache, jobs, attempt]);

  return { files, failed, isRendering: pending > 0, retry };
}

/** "Aa" previews keyed by font id. */
export function useFontPreviews(fonts: Font[] | undefined, enabled: boolean): RenderedImages {
  const jobs = useMemo(
    () =>
      enabled
        ? fonts?.flatMap((font) => {
            const preview = font.preview;
            if (!preview) return [];
            return {
              id: font.id,
              name: `${font.id}-${preview.styleId}`,
              render: async () => renderSampleSvg(await fetchFontData(preview.woffUrl)),
            };
          })
        : undefined,
    [fonts, enabled],
  );
  return useRenderedImages("previews", jobs);
}

/** Pairing cards keyed by pair id. */
export function usePairPreviews(pairs: FontPair[] | undefined): RenderedImages {
  const jobs = useMemo(
    () =>
      pairs?.map((pair) => ({
        id: pair.id,
        name: `${pair.id}-${pair.headline.styleId}-${pair.body.styleId}`,
        render: async () => {
          const [headline, body] = await Promise.all([
            fetchFontData(pair.headline.woffUrl),
            fetchFontData(pair.body.woffUrl),
          ]);
          return renderPairSvg(
            { data: headline, text: pair.headline.text, size: pair.headline.size },
            { data: body, text: pair.body.text, size: pair.body.size },
          );
        },
      })),
    [pairs],
  );
  return useRenderedImages("pairs", jobs);
}

/** Previews of `text` keyed by font id. Only the images of the current text are kept on disk. */
export function useTextPreviews(fonts: Font[] | undefined, text: string): RenderedImages {
  const textKey = useMemo(() => createHash("sha1").update(text).digest("hex").slice(0, 12), [text]);

  useEffect(() => {
    const dir = cacheDir("texts");
    readdir(dir)
      .then((files) =>
        Promise.all(
          files.filter((file) => !file.startsWith(`${textKey}-`)).map((file) => rm(join(dir, file), { force: true })),
        ),
      )
      .catch(() => {
        // Nothing cached yet.
      });
  }, [textKey]);

  const jobs = useMemo(
    () =>
      fonts?.flatMap((font) => {
        const preview = font.preview;
        if (!preview) return [];
        return {
          id: font.id,
          name: `${textKey}-${font.id}-${preview.styleId}`,
          render: async () => renderTextSvg(await fetchFontData(preview.woffUrl), text),
        };
      }),
    [fonts, text, textKey],
  );
  return useRenderedImages("texts", jobs);
}

/**
 * Returns a file URL for showing a cached image in markdown. Markdown doesn't crop like grids and doesn't support
 * `tintColor` reliably, so it uses the drawing without the grid margin, filled with a color that suits the current
 * appearance.
 */
export function markdownImageUrl(gridFile: string): string {
  const themed = gridFile.replace(/\.grid\.svg$/, `-${environment.appearance}.svg`);
  if (!existsSync(themed)) {
    const fill = environment.appearance === "dark" ? "#ececec" : "#1c1c1c";
    const svg = readFileSync(gridFile.replace(/\.grid\.svg$/, ".svg"), "utf8");
    writeFileSync(themed, svg.replace("<svg ", `<svg fill="${fill}" `));
  }
  // pathToFileURL handles Windows paths (drive letters, backslashes) as well as spaces.
  return pathToFileURL(themed).href;
}
