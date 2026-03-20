import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { createHash } from "crypto";
import {
  createReadStream,
  existsSync,
  readdirSync,
  renameSync,
  statSync,
} from "fs";
import { extname, join, basename } from "path";

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

function isImage(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/** Returns true if filename already looks like name.XXXXXXXX.ext (8-char hex hash) */
function alreadyHashed(filename: string): boolean {
  const ext = extname(filename);
  const stem = basename(filename, ext);
  // stem must contain at least one dot — last segment is the hash
  const parts = stem.split(".");
  if (parts.length < 2) return false;
  const last = parts[parts.length - 1];
  return /^[0-9a-f]{8}$/.test(last);
}

export default async function main() {
  const { folder } = getPreferenceValues<ExtensionPreferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Processing images…",
    message: folder,
  });

  try {
    const entries = readdirSync(folder);
    const images = entries.filter((f) => {
      const full = join(folder, f);
      return statSync(full).isFile() && isImage(f) && !alreadyHashed(f);
    });

    if (images.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing to rename",
        message: "All images already have a hash, or the folder is empty.",
      });
      return;
    }

    let renamed = 0;
    const errors: string[] = [];

    for (const filename of images) {
      const full = join(folder, filename);
      const ext = extname(filename);
      const stem = basename(filename, ext);
      try {
        const hash = await md5Hash(full);
        const newName = `${stem}.${hash}${ext}`;
        const newPath = join(folder, newName);
        if (existsSync(newPath)) {
          errors.push(
            `${filename}: target "${newName}" already exists, skipping`,
          );
        } else {
          renameSync(full, newPath);
          renamed++;
        }
      } catch (err) {
        errors.push(
          `${filename}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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
