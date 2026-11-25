import { spawn } from "node:child_process";
import { mkdir, readdir, rename, rm, stat, utimes } from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { SFSymbolsApp } from "./sfsymbols-cli";

/**
 * Grid tiles are rendered locally by the SF Symbols CLI instead of downloaded from a third-party
 * image repository. That repository stopped at SF Symbols 6, so every newer symbol had no image;
 * rendering from the installed app covers exactly the symbols the app knows about.
 *
 * Monochrome tiles are black PNGs that the grid tints to the theme's text color, the same way it
 * tinted the downloaded images, so one set serves light and dark. Hierarchical and multicolor tiles
 * carry their own colors and can't be tinted, so they render in the theme's text color directly,
 * one set per appearance. Both sets are rendered, because Raycast tells an extension its appearance
 * only at launch: given both images, Raycast itself swaps them when the theme changes.
 */
const TILES_ROOT = path.join(environment.supportPath, "tiles");

export type TileMode = "monochrome" | "hierarchical" | "multicolor";
export const TILE_MODES: readonly TileMode[] = ["monochrome", "hierarchical", "multicolor"];

export type TileStyle = { mode: TileMode; weight: string };

/** Other tile sets kept on disk besides the current style's, so switching back is instant. */
const KEPT_STYLES = 4;

export type Appearance = "light" | "dark";

/** Whether tiles of this style are drawn in one color that the grid tints. */
export function isTinted(style: TileStyle): boolean {
  return style.mode === "monochrome";
}

/** The theme's text color, which colored renderings are drawn in. */
export function textColor(appearance: Appearance): string {
  return appearance === "dark" ? "white" : "black";
}

function tileColor(style: TileStyle, appearance: Appearance): string {
  return isTinted(style) ? "black" : textColor(appearance);
}

/** Identifies one rendered set: catalog version, then weight, mode and (for colored modes) appearance. */
export function tileSetKey(
  catalogKey: string,
  style: TileStyle,
  appearance: Appearance = environment.appearance,
): string {
  const suffix = isTinted(style) ? "" : `-${appearance}`;
  // Multicolor sets were once drawn with the text color as their tint; the name keeps those apart.
  const tint = style.mode === "multicolor" ? "-accent" : "";
  return path.join(catalogKey, `${style.weight}-${style.mode}${tint}${suffix}`);
}

/** 48pt at 2x is about 96px: sharp in an 8-column grid, about 4KB per tile. */
const TILE_POINT_SIZE = "48";
const TILE_IMAGE_SCALE = "2";

/** Tiles are keyed by catalog version, so a new SF Symbols release re-renders changed glyphs. */
function tileDir(setKey: string): string {
  return path.join(TILES_ROOT, setKey);
}

export function tilePath(setKey: string, name: string): string {
  return path.join(tileDir(setKey), `${name}.png`);
}

/** Names that already have a rendered tile on disk. */
export async function listTiles(setKey: string): Promise<Set<string>> {
  try {
    const entries = await readdir(tileDir(setKey));
    return new Set(entries.filter((entry) => entry.endsWith(".png")).map((entry) => entry.slice(0, -4)));
  } catch {
    return new Set();
  }
}

/**
 * Renders every missing tile in one CLI run (about 7,300 symbols in under 10 seconds on first launch,
 * nothing after that).
 *
 * The CLI writes into a staging folder, and each file moves into place only after the CLI reports
 * it written, so the grid never points at a half-written PNG. Progress is counted from those same
 * reports. Older catalog versions' tiles are removed once the current set is complete.
 */
export async function renderMissingTiles(
  app: SFSymbolsApp,
  catalogKey: string,
  style: TileStyle,
  names: readonly string[],
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
  appearance: Appearance = environment.appearance,
  multicolorNames: ReadonlySet<string> = new Set(),
): Promise<number> {
  const setKey = tileSetKey(catalogKey, style, appearance);
  // Both appearances of the current style are in use (Raycast picks one per theme), so neither is pruned.
  const keep = [tileSetKey(catalogKey, style, "light"), tileSetKey(catalogKey, style, "dark")].map((key) =>
    path.basename(key),
  );
  const finalDir = tileDir(setKey);
  await mkdir(finalDir, { recursive: true });
  const existing = await listTiles(setKey);
  const missing = names.filter((name) => !existing.has(name));

  if (missing.length === 0) {
    // Mark the set as just used, so pruning ranks it by use rather than by when it was rendered.
    const now = new Date();
    await utimes(finalDir, now, now).catch(() => {});
    await pruneOldTileSets(catalogKey, keep);
    return 0;
  }
  if (signal.aborted) return 0;

  const stagingDir = path.join(TILES_ROOT, `.staging-${process.pid}-${Date.now()}`);
  await mkdir(stagingDir, { recursive: true });
  onProgress(0, missing.length);

  let done = 0;
  let moveFailures = 0;
  const diagnostics: string[] = [];
  const moves: Promise<void>[] = [];
  let failedRuns = 0;
  try {
    for (const run of colorRuns(style, appearance, missing, multicolorNames)) {
      if (signal.aborted) break;
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(app.cliPath, [
          "export",
          "--names-file",
          "-",
          "--format",
          "png",
          "--output-dir",
          stagingDir,
          "--continue-on-error",
          "--rendering-mode",
          style.mode,
          "--weight",
          style.weight,
          "--color",
          run.color,
          "--point-size",
          TILE_POINT_SIZE,
          "--image-scale",
          TILE_IMAGE_SCALE,
        ]);
        const abort = () => child.kill();
        signal.addEventListener("abort", abort, { once: true });

        // The CLI reports each file on stderr as "sfsymbols: wrote <path>". Chunks can split a
        // line, so hold the remainder until its newline arrives.
        let pending = "";
        child.stderr.on("data", (chunk: Buffer) => {
          pending += chunk.toString();
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const line of lines) {
            const match = line.match(/^sfsymbols: wrote (.+\.png)$/);
            if (!match) {
              // Everything else is the CLI's summary or its per-symbol failure report.
              if (line.trim()) diagnostics.push(line.trim());
              continue;
            }
            const written = match[1];
            moves.push(
              rename(written, path.join(finalDir, path.basename(written))).then(
                () => {
                  // Progress counts tiles that reached the grid, not files the CLI merely wrote.
                  done += 1;
                  onProgress(Math.min(done, missing.length), missing.length);
                },
                () => {
                  moveFailures += 1;
                },
              ),
            );
          }
        });
        child.on("error", reject);
        // A CLI that exits before reading its input breaks the pipe. Without a listener that error
        // is thrown uncaught; the non-zero exit code already reports the failed run.
        child.stdin.on("error", () => {});
        child.on("close", (code) => {
          signal.removeEventListener("abort", abort);
          resolve(code);
        });
        child.stdin.end(run.names.join("\n"));
      });
      if (exitCode !== 0) failedRuns += 1;
    }
    await Promise.all(moves);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }

  if (signal.aborted) return done;

  // Tiles that did render are already in place and stay there; a partial failure still has to
  // be reported, or the missing images go unexplained.
  if (failedRuns > 0 || moveFailures > 0) {
    const failed = missing.length - done;
    const detail = diagnostics.filter((line) => !line.startsWith("sfsymbols: wrote ")).slice(0, 5);
    throw new Error(
      [
        `${failed.toLocaleString()} of ${missing.length.toLocaleString()} symbol images could not be rendered.`,
        ...detail,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  await pruneOldTileSets(catalogKey, keep);
  return done;
}

/** How many of the first names (the ones on screen) render before the rest. */
const FIRST_RUN = 300;

/**
 * Splits a render into CLI runs by tint color, keeping the first names (the ones on screen) ahead
 * of the rest.
 *
 * Multicolor draws some layers in the tint color and others in fixed colors, often white (the dots
 * in `circle.dotted.circle.fill`). With the text color as the tint, those white layers vanish into a
 * white symbol in dark mode, so symbols with real multicolor art are tinted with the system accent,
 * as the SF Symbols app draws them. Symbols without it have only the tint, so they keep the text color.
 */
function colorRuns(
  style: TileStyle,
  appearance: Appearance,
  names: readonly string[],
  multicolorNames: ReadonlySet<string>,
): { names: string[]; color: string }[] {
  const textColor = tileColor(style, appearance);
  if (style.mode !== "multicolor") return [{ names: [...names], color: textColor }];
  return [names.slice(0, FIRST_RUN), names.slice(FIRST_RUN)].flatMap((part) =>
    [
      { names: part.filter((name) => multicolorNames.has(name)), color: "accent" },
      { names: part.filter((name) => !multicolorNames.has(name)), color: textColor },
    ].filter((run) => run.names.length > 0),
  );
}

/**
 * Removes tiles from older catalog versions, and all but the few most recently used other styles
 * of the current one, so trying every weight and mode can't fill the disk (each set is about 30 MB).
 */
async function pruneOldTileSets(catalogKey: string, keep: readonly string[]): Promise<void> {
  try {
    for (const entry of await readdir(TILES_ROOT)) {
      // Staging folders belong to a render that may still be running in another window.
      if (entry === catalogKey || entry.startsWith(".staging-")) continue;
      await rm(path.join(TILES_ROOT, entry), { recursive: true, force: true });
    }
    const catalogDir = path.join(TILES_ROOT, catalogKey);
    const others = await Promise.all(
      (await readdir(catalogDir))
        .filter((entry) => !keep.includes(entry))
        .map(async (entry) => ({ entry, mtime: (await stat(path.join(catalogDir, entry))).mtimeMs })),
    );
    others.sort((a, b) => b.mtime - a.mtime);
    for (const { entry } of others.slice(KEPT_STYLES)) {
      await rm(path.join(catalogDir, entry), { recursive: true, force: true });
    }
  } catch {
    // Nothing to prune.
  }
}
