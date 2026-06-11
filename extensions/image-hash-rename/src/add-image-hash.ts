import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { createHash } from "crypto";
import { createReadStream, constants } from "fs";
import { access, readdir, rename, stat } from "fs/promises";
import { basename, extname, join } from "path";

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
  ".tif",
  ".ico",
  ".avif",
]);

function md5Hash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex").slice(0, 8)));
    stream.on("error", reject);
  });
}

function isImage(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());
}

/**
 * If the filename matches the `name.XXXXXXXX.ext` pattern, returns the
 * 8-char hex candidate embedded in it. Otherwise returns null.
 *
 * The caller is responsible for verifying the candidate against the actual
 * file content before deciding to skip the file — a name-only check risks
 * false positives for files like `logo.deadbeef.png` that were never
 * processed by this tool but happen to carry an 8-char hex segment.
 */
function extractHashCandidate(filename: string): string | null {
  const ext = extname(filename);
  const stem = basename(filename, ext);
  const parts = stem.split(".");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  return /^[0-9a-f]{8}$/.test(last) ? last : null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export default async function main() {
  const { folder } = getPreferenceValues<ExtensionPreferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Processing images…",
    message: folder,
  });

  try {
    const entries = await readdir(folder);

    // Stat all entries concurrently; keep only plain image files.
    const imageFiles = (
      await Promise.all(
        entries.map(async (f) => {
          const full = join(folder, f);
          const info = await stat(full);
          return info.isFile() && isImage(f) ? { filename: f, full } : null;
        }),
      )
    ).filter((x): x is { filename: string; full: string } => x !== null);

    if (imageFiles.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing to rename",
        message: "No image files found in the folder.",
      });
      return;
    }

    let renamed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const { filename, full } of imageFiles) {
      const ext = extname(filename);
      const stem = basename(filename, ext);
      try {
        // Compute the hash once and reuse it for both the idempotency check
        // and the new filename — avoids hashing each file twice.
        const hash = await md5Hash(full);

        // True idempotency: skip only when the hash embedded in the filename
        // matches the actual content hash. A pure name-based check would
        // incorrectly skip files like `logo.deadbeef.png` whose hex segment
        // was never written by this tool.
        if (extractHashCandidate(filename) === hash) {
          skipped++;
          continue;
        }

        const newName = `${stem}.${hash}${ext}`;
        const newPath = join(folder, newName);

        if (await fileExists(newPath)) {
          errors.push(
            `${filename}: target "${newName}" already exists, skipping`,
          );
        } else {
          await rename(full, newPath);
          renamed++;
        }
      } catch (err) {
        errors.push(
          `${filename}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (renamed === 0 && errors.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing to rename",
        message: `All ${skipped} image${skipped === 1 ? "" : "s"} already have a hash.`,
      });
      return;
    }

    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Renamed ${renamed}, ${errors.length} failed`,
        message: errors.slice(0, 3).join("\n"),
      });
    } else {
      await toast.hide();
      await showHUD(`✅ Renamed ${renamed} image${renamed === 1 ? "" : "s"}`);
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to read folder",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
