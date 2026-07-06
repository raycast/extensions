import { environment } from "@raycast/api";
import { compositeImage } from "swift:../../swift";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ICON_STYLE_ICONS } from "../constants/icon-style-icons.constant";
import { APPEARANCE_BG_COLORS } from "../constants/appearance-colors.constant";
import { Profile } from "../types/types";

const CACHE_DIR = join(environment.supportPath, "composites");
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

export class Thumbnails {
  static async generateAll(profiles: Profile[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    await Promise.all(
      profiles.map(async (profile) => {
        result[profile.id] = await Thumbnails.generate(profile);
      }),
    );
    return result;
  }

  static async generate(profile: Profile): Promise<string> {
    Thumbnails.ensureCacheDir();

    const key = Thumbnails.cacheKey(profile);
    const outputPath = join(CACHE_DIR, `${key}.png`);

    if (existsSync(outputPath)) {
      return outputPath;
    }

    const iconSource = ICON_STYLE_ICONS[profile.iconStyle].source;
    const overlayPath = join(environment.assetsPath, typeof iconSource === "string" ? iconSource : iconSource.light);
    const bgColor = APPEARANCE_BG_COLORS[profile.appearance];

    await compositeImage(profile.wallpaperPath, overlayPath, outputPath, bgColor, CANVAS_WIDTH, CANVAS_HEIGHT);
    return outputPath;
  }

  private static cacheKey(profile: Profile): string {
    let mtime = "";
    if (profile.wallpaperPath) {
      try {
        mtime = String(statSync(profile.wallpaperPath).mtimeMs);
      } catch {
        // wallpaper file may have been deleted
      }
    }
    return createHash("md5")
      .update(`${profile.wallpaperPath}|${profile.iconStyle}|${profile.appearance}|${mtime}`)
      .digest("hex");
  }

  private static ensureCacheDir() {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
  }
}
