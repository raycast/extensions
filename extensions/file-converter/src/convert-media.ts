import {
  showToast,
  Toast,
  getSelectedFinderItems,
  showHUD,
  open,
} from "@raycast/api";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { buildOutputPath } from "./utils";

const MEDIA_EXTS = new Set([
  "mp4",
  "mkv",
  "mov",
  "avi",
  "webm",
  "gif",
  "m4v",
  "flv",
  "mp3",
  "wav",
  "aac",
  "flac",
  "ogg",
  "m4a",
  "wma",
]);

const AUDIO_EXTS = new Set(["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"]);

export async function convertFinderMediaTo(
  targetExt: string,
  label: string,
): Promise<void> {
  let items;
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Aucun fichier sélectionné dans Finder",
    });
    return;
  }

  const valid = items.filter((i) =>
    MEDIA_EXTS.has(path.extname(i.path).replace(".", "").toLowerCase()),
  );

  if (!valid.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Aucun fichier audio/vidéo compatible sélectionné",
    });
    return;
  }

  const audioOnly = AUDIO_EXTS.has(targetExt) ? "-vn " : "";
  let converted = 0;
  let lastDir = "";

  for (const item of valid) {
    const outputPath = buildOutputPath(item.path, targetExt);
    await showToast({
      style: Toast.Style.Animated,
      title: `Conversion en ${label}… (${converted + 1}/${valid.length})`,
    });

    try {
      execSync(
        `/opt/homebrew/bin/ffmpeg -y -i "${item.path}" ${audioOnly}"${outputPath}"`,
        { timeout: 300_000 },
      );
      if (fs.existsSync(outputPath)) {
        converted++;
        lastDir = path.dirname(outputPath);
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Erreur sur ${path.basename(item.path)}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (converted > 0) {
    await showHUD(
      `✅ ${converted} fichier${converted > 1 ? "s" : ""} converti${converted > 1 ? "s" : ""} en ${label}`,
    );
    await open(lastDir);
  }
}
