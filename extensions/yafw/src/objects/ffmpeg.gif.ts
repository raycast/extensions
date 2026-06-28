import { environment } from "@raycast/api";
import path from "path";
import { File, Gif } from "../abstractions";
import { sanitizeFileName } from "../utils";
import { Ffmpeg } from "./ffmpeg";
import { FsFile } from "./fs.file";

export class FfmpegGif implements Gif {
  constructor(
    private readonly ffmpeg: Ffmpeg,
    private readonly file: File,
  ) {}

  encode: Gif["encode"] = async (options = {}) => {
    const { width, height, fps, quality, speed, loop } = options;

    const filePath = this.file.path();
    const sourceDirPath = path.dirname(filePath);
    const targetGifPath = path.join(sourceDirPath, this.file.nextName({ extension: ".gif" }));
    const paletteFile = new FsFile(path.join(environment.supportPath, "palette.png"));

    // Filters applied identically in both passes so the generated palette matches the encoded frames.
    const filterChain = this.buildFilterChain({ width, height, fps, speed });
    const maxColors = this.paletteColors(quality);

    // Pass 1: generate an optimized palette from the (filtered) frames.
    const palettegen = `palettegen=stats_mode=diff${maxColors != null ? `:max_colors=${maxColors}` : ""}`;
    const paletteFilter = filterChain ? `${filterChain},${palettegen}` : palettegen;

    // Pass 2: encode the GIF using that palette. This is the part that was previously missing:
    // the palette is now passed as a second input and applied with `paletteuse`.
    const paletteuse = "paletteuse=dither=sierra2_4a";
    const lavfi = filterChain ? `[0:v] ${filterChain} [x]; [x][1:v] ${paletteuse}` : `[0:v][1:v] ${paletteuse}`;
    const loopArg = loop == null ? undefined : `-loop ${loop === "once" ? -1 : 0}`;

    try {
      await this.ffmpeg.exec({
        input: filePath,
        params: [`-vf "${paletteFilter}"`],
        output: paletteFile.path(),
      });
      await this.ffmpeg.exec({
        input: filePath,
        params: [`-i ${sanitizeFileName(paletteFile.path())}`, `-lavfi "${lavfi}"`, loopArg],
        output: targetGifPath,
      });
    } finally {
      await paletteFile.remove();
    }
  };

  /**
   * Builds the comma-separated ffmpeg filter chain shared by both passes.
   * Order matters: speed (setpts) -> frame rate (fps) -> scaling.
   */
  private buildFilterChain(options: { width?: number; height?: number; fps?: number; speed?: number }): string {
    const { width, height, fps, speed } = options;
    const filters: string[] = [];

    if (speed != null && speed > 0 && speed !== 1) {
      filters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    }

    if (fps != null && fps > 0) {
      filters.push(`fps=${fps}`);
    }

    if (width != null && height == null) {
      filters.push(`scale=${width}:-2:flags=lanczos`);
    } else if (width == null && height != null) {
      filters.push(`scale=-2:${height}:flags=lanczos`);
    } else if (width != null && height != null) {
      filters.push(`scale=${width}:${height}:flags=lanczos`);
    }

    return filters.join(",");
  }

  /**
   * Maps a 1-100 quality value to the number of palette colors (ffmpeg accepts 4-256).
   * Returns undefined when no quality is provided, leaving the palette at full size.
   */
  private paletteColors(quality?: number): number | undefined {
    if (quality == null) {
      return undefined;
    }
    const clamped = Math.min(100, Math.max(1, quality));
    return Math.min(256, Math.max(4, Math.round(2 + (clamped / 100) * 254)));
  }
}
