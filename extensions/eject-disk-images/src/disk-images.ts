import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

const run = promisify(execFile);

/** One attached disk image, as reported by `hdiutil info`. */
export interface DiskImage {
  /** Path of the image file, e.g. /Users/me/Downloads/Foo.dmg */
  imagePath: string;
  /** File name of the image, e.g. Foo.dmg */
  imageName: string;
  /** Whole-disk device node, e.g. /dev/disk4 — detaching it detaches every partition */
  device: string;
  /** Mounted volume paths, e.g. ["/Volumes/Foo"] (empty if attached but not mounted) */
  mountPoints: string[];
  /** Volume names, e.g. ["Foo"] */
  volumeNames: string[];
}

export interface EjectResult {
  image: DiskImage;
  ok: boolean;
  forced: boolean;
  error?: string;
}

interface HdiutilEntity {
  "dev-entry"?: string;
  "mount-point"?: string;
}

interface HdiutilImage {
  "image-path"?: string;
  "system-entities"?: HdiutilEntity[];
}

// Raycast runs commands with a minimal PATH, so call system tools by absolute path.
const HDIUTIL = "/usr/bin/hdiutil";
const PLUTIL = "/usr/bin/plutil";

/**
 * Lists attached disk images only. `hdiutil info` reports images attached through
 * the disk-image framework, so internal disks, external HDD/SSD, USB flash drives
 * and SD cards never appear here — that is what keeps physical drives safe.
 */
export async function listDiskImages(): Promise<DiskImage[]> {
  const { stdout: plist } = await run(HDIUTIL, ["info", "-plist"], { maxBuffer: 10 * 1024 * 1024 });
  const json = await plistToJson(plist);
  const images: HdiutilImage[] = json.images ?? [];

  const result: DiskImage[] = [];
  for (const img of images) {
    const entities = img["system-entities"] ?? [];
    const devEntries = entities.map((e) => e["dev-entry"]).filter((d): d is string => !!d);
    // Whole disk is /dev/diskN (no "sN" slice suffix). Fall back to the shortest entry.
    const device =
      devEntries.find((d) => /^\/dev\/disk\d+$/.test(d)) ?? devEntries.sort((a, b) => a.length - b.length)[0];
    if (!device) continue;

    const mountPoints = entities.map((e) => e["mount-point"]).filter((m): m is string => !!m);
    const imagePath = img["image-path"] ?? device;

    result.push({
      imagePath,
      imageName: path.basename(imagePath),
      device,
      mountPoints,
      volumeNames: mountPoints.map((m) => path.basename(m)),
    });
  }
  return result;
}

/** Applies the user's "Skip Backups" and "Exclude Images" preferences. */
export function filterByPreferences(images: DiskImage[]): { eligible: DiskImage[]; skipped: DiskImage[] } {
  const prefs = getPreferenceValues<Preferences>();
  const patterns = (prefs.excludePatterns ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const eligible: DiskImage[] = [];
  const skipped: DiskImage[] = [];
  for (const image of images) {
    if ((prefs.skipBackups ?? true) && isBackupImage(image)) {
      skipped.push(image);
      continue;
    }
    const haystack = [image.imagePath, ...image.volumeNames].join("\n").toLowerCase();
    if (patterns.some((p) => haystack.includes(p))) {
      skipped.push(image);
      continue;
    }
    eligible.push(image);
  }
  return { eligible, skipped };
}

export function isBackupImage(image: DiskImage): boolean {
  const p = image.imagePath.toLowerCase();
  return (
    p.endsWith(".backupbundle") ||
    p.includes(".backupbundle/") ||
    (p.endsWith(".sparsebundle") &&
      (p.startsWith("/volumes/") || image.volumeNames.some((v) => /time machine|backup/i.test(v))))
  );
}

/**
 * Detaches one image; retries with -force if allowed.
 * The device node is looked up again right before each detach, because a row in the list can be stale:
 * if the image was ejected elsewhere, macOS may have reused its /dev/diskN for a different image.
 */
export async function ejectImage(image: DiskImage, forceOverride?: boolean): Promise<EjectResult> {
  const prefs = getPreferenceValues<Preferences>();
  const allowForce = forceOverride ?? prefs.forceEject ?? false;

  let first: string | undefined;
  try {
    first = await currentDevice(image);
  } catch (error) {
    return { image, ok: false, forced: false, error: `Couldn't check the image before ejecting: ${errorText(error)}` };
  }
  if (!first) return { image, ok: true, forced: false };
  try {
    await run(HDIUTIL, ["detach", first, "-quiet"]);
    return { image, ok: true, forced: false };
  } catch (error) {
    if (!allowForce) return { image, ok: false, forced: false, error: errorText(error) };
    let retry: string | undefined;
    try {
      retry = await currentDevice(image);
    } catch (lookupError) {
      return {
        image,
        ok: false,
        forced: false,
        error: `Couldn't check the image before force-ejecting: ${errorText(lookupError)}`,
      };
    }
    if (!retry) return { image, ok: true, forced: false };
    try {
      await run(HDIUTIL, ["detach", retry, "-force", "-quiet"]);
      return { image, ok: true, forced: true };
    } catch (forceError) {
      return { image, ok: false, forced: true, error: errorText(forceError) };
    }
  }
}

/**
 * Returns the device node the image is attached at right now, or undefined if it is no longer attached.
 * Matches on the device and the image file path together, so a reused device number is never detached.
 */
async function currentDevice(image: DiskImage): Promise<string | undefined> {
  const attached = await listDiskImages();
  return attached.find((i) => i.device === image.device && i.imagePath === image.imagePath)?.device;
}

/** Ejects images in parallel and returns per-image results. */
export async function ejectImages(images: DiskImage[], forceOverride?: boolean): Promise<EjectResult[]> {
  return Promise.all(images.map((img) => ejectImage(img, forceOverride)));
}

export function summarize(results: EjectResult[]): string {
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  const word = (n: number) => (n === 1 ? "image" : "images");
  if (failed === 0) return `Ejected ${ok} disk ${word(ok)}`;
  if (ok === 0) return `Couldn't eject ${failed} disk ${word(failed)}`;
  return `Ejected ${ok}, failed ${failed}`;
}

function plistToJson(plist: string): Promise<{ images?: HdiutilImage[] }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      PLUTIL,
      ["-convert", "json", "-o", "-", "-"],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, out) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          reject(e);
        }
      },
    );
    child.stdin?.end(plist);
  });
}

function errorText(error: unknown): string {
  const e = error as { stderr?: string; message?: string };
  const text = (e.stderr || e.message || String(error)).trim();
  if (/resource busy|in use|couldn't unmount/i.test(text)) return "Image is busy — close files or apps using it";
  return text.split("\n").pop() ?? text;
}
