import { Clipboard, Toast, closeMainWindow, environment, showHUD, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Forecast, GeoResult, degreesToCompass, fmt } from "./api";
import { dayHero, dayHours, nextHours, nowHero, timeOf } from "./build";
import {
  HeroOptions,
  Stat,
  StripHour,
  composeRadarShareCard,
  composeShareCard,
  renderHero,
  renderHourlyStrip,
  renderStatsBar,
} from "./svg";
import { HeroStyle, ThemeId } from "./themes";

const execFileAsync = promisify(execFile);

const FULL_WIDTH = 840;

function card(opts: HeroOptions, hours: StripHour[], stripTitle: string, stats: Stat[]): string {
  const hero = renderHero({ ...opts, displayWidth: FULL_WIDTH, idPrefix: "h-" });
  const strip = renderHourlyStrip(hours, opts.style, stripTitle, FULL_WIDTH, "s-");
  const bar = renderStatsBar(stats, opts.style, FULL_WIDTH, "st-");
  return composeShareCard(hero, strip, bar);
}

/** Current conditions + next 10 hours, at full resolution. */
export function buildNowShareSvg(
  forecast: Forecast,
  place: GeoResult,
  theme: ThemeId,
  unitSymbol: string,
  windUnit: string,
): string {
  const cur = forecast.current;
  return card(nowHero(forecast, place, theme, unitSymbol), nextHours(forecast, 10), "Next 10 hours", [
    { label: "Humidity", value: fmt(cur.relative_humidity_2m, "%") },
    {
      label: "Wind",
      value: `${fmt(cur.wind_speed_10m)} ${windUnit} ${degreesToCompass(cur.wind_direction_10m)}`,
    },
    { label: "UV", value: fmt(cur.uv_index) },
    { label: "Sunrise", value: timeOf(forecast.daily.sunrise[0]) },
    { label: "Sunset", value: timeOf(forecast.daily.sunset[0]) },
  ]);
}

/** A single forecast day, at full resolution. */
export function buildDayShareSvg(
  forecast: Forecast,
  dayIndex: number,
  place: GeoResult,
  theme: ThemeId,
  unitSymbol: string,
  windUnit: string,
): string {
  const d = dayIndex;
  const daily = forecast.daily;
  return card(dayHero(forecast, d, place, theme, unitSymbol), dayHours(forecast, d), "During the day", [
    { label: "Rain", value: fmt(daily.precipitation_probability_max[d], "%") },
    { label: "Max Wind", value: fmt(daily.wind_speed_10m_max[d], ` ${windUnit}`) },
    { label: "UV", value: fmt(daily.uv_index_max[d]) },
    { label: "Sunrise", value: timeOf(daily.sunrise[d]) },
    { label: "Sunset", value: timeOf(daily.sunset[d]) },
  ]);
}

/** The full-width radar card plus a themed stats footer, squared for sharing. */
export function buildRadarShareSvg(radarSvg: string, stats: Stat[], style: HeroStyle): string {
  return composeRadarShareCard(radarSvg, renderStatsBar(stats, style, FULL_WIDTH, "st-"));
}

export type ShareMode = "copy" | "paste" | "save";

/**
 * Rasterize the SVG to a retina PNG in a fresh temp directory. Uses macOS's
 * built-in QuickLook renderer — Raycast extensions can't ship native
 * rasterizer modules. The caller removes the directory when done.
 */
async function rasterize(svg: string): Promise<{ png: string; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "weather-share-"));
  const svgPath = join(dir, "card.svg");
  const png = `${svgPath}.png`;
  try {
    writeFileSync(svgPath, svg);
    // QuickLook occasionally hangs on complex SVGs; don't leave the action stuck.
    await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", String(FULL_WIDTH * 2), "-o", dir, svgPath], {
      timeout: 20_000,
    });
    if (!existsSync(png)) throw new Error("QuickLook could not render the image");
    return { png, dir };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Filename-safe form of a place-derived name. Geocoder strings can carry
 * control characters, leading dots, or be far longer than a filename allows.
 * The extension is kept intact; only the stem is shortened.
 */
function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot).replace(/[^\w.]+/g, "") : "";
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^[.-]+/, "")
    .replace(/-+/g, "-")
    .slice(0, 80 - ext.length);
  return (stem || "weather") + ext;
}

/** Copy into ~/Downloads without overwriting; appends -2, -3, … on collisions. */
function saveToDownloads(path: string, fileName: string): string {
  const downloads = join(homedir(), "Downloads");
  mkdirSync(downloads, { recursive: true });
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";
  for (let n = 1; n < 100; n++) {
    const target = join(downloads, n === 1 ? fileName : `${stem}-${n}${ext}`);
    try {
      copyFileSync(path, target, constants.COPYFILE_EXCL);
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Too many files with this name in Downloads");
}

/** Clipboard shares are staged here: the clipboard holds a path, not pixels, so the file must outlive the call. */
const SHARE_DIR = join(environment.supportPath, "share");
/** Past shares kept so "Copy" and Clipboard History pastes still resolve; older ones are pruned. */
const KEEP_SHARES = 5;
/** Single reused files written by earlier versions. */
const LEGACY_SHARE_FILES = ["forecast-share.png", "radar-share.gif"];

/**
 * Stage a rendered file for the clipboard under a name unique to its content.
 *
 * Receiving apps may cache a pasted attachment by its path or file name, so
 * reusing one name made a second paste show the first image. The name carries
 * a content hash, so an existing file with that name already holds the same
 * bytes and is reused rather than overwritten, which also avoids touching a
 * file a receiving app still has open (Windows locks those). Pruning orders
 * shares by modification time, so a reused file is re-stamped as the latest.
 */
function stageShareFile(source: string, fileName: string): string {
  mkdirSync(SHARE_DIR, { recursive: true });
  const bytes = readFileSync(source);
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
  const safe = safeFileName(fileName);
  const dot = safe.lastIndexOf(".");
  const target = join(SHARE_DIR, `${safe.slice(0, dot)}-${hash}${safe.slice(dot)}`);
  if (existsSync(target)) {
    try {
      const now = new Date();
      utimesSync(target, now, now);
    } catch {
      // Locked elsewhere; it keeps its older timestamp.
    }
  } else {
    writeFileSync(target, bytes);
  }
  pruneShares(target);
  return target;
}

/** Keep `current` plus the newest shares; anything still open elsewhere (Windows) is skipped and retried next time. */
function pruneShares(current: string): void {
  let entries: { path: string; mtime: number }[];
  try {
    entries = readdirSync(SHARE_DIR).flatMap((name) => {
      const path = join(SHARE_DIR, name);
      try {
        return path === current ? [] : [{ path, mtime: statSync(path).mtimeMs }];
      } catch {
        return [];
      }
    });
  } catch {
    return;
  }
  entries.sort((a, b) => b.mtime - a.mtime);
  const stale = entries.slice(KEEP_SHARES - 1).map((e) => e.path);
  for (const name of LEGACY_SHARE_FILES) stale.push(join(environment.supportPath, name));
  for (const path of stale) {
    try {
      unlinkSync(path);
    } catch {
      // Missing, or locked by the app that is still reading it.
    }
  }
}

/**
 * Copy the file, paste it into the frontmost app, or save it to ~/Downloads.
 * Clipboard modes reference the file by path, so `path` must outlive the call.
 */
async function shareFile(path: string, mode: ShareMode, saveName: string, what: string): Promise<void> {
  if (mode === "paste") {
    await closeMainWindow();
    await Clipboard.paste({ file: path });
    await showHUD(`Pasted ${what}`);
    return;
  }
  if (mode === "save") {
    const target = saveToDownloads(path, safeFileName(saveName));
    await showToast({ style: Toast.Style.Success, title: `Saved to Downloads`, message: target.split("/").pop() });
    return;
  }
  await Clipboard.copy({ file: path });
  await showToast({
    style: Toast.Style.Success,
    title: `${what[0].toUpperCase()}${what.slice(1)} copied`,
    message: "Paste it in Slack, iMessage, anywhere",
  });
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Rasterize a share card and copy/paste/save it. macOS only (QuickLook). */
export async function shareForecastImage(svg: string, mode: ShareMode, baseName: string): Promise<void> {
  const { png, dir } = await rasterize(svg);
  try {
    const fileName = `${baseName}-${stamp()}.png`;
    // The temp dir is removed below; clipboard modes need a path that survives.
    const path = mode === "save" ? png : stageShareFile(png, fileName);
    await shareFile(path, mode, fileName, "forecast image");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Copy/paste/save the animated radar GIF. No rasterizer needed, so this works everywhere. */
export async function shareRadarGif(gifPath: string, mode: ShareMode, baseName: string): Promise<void> {
  const fileName = `${baseName}-radar-${stamp()}.gif`;
  // Panning/zooming deletes superseded GIFs; clipboard modes need a path that survives.
  const path = mode === "save" ? gifPath : stageShareFile(gifPath, fileName);
  await shareFile(path, mode, fileName, "radar animation");
}
