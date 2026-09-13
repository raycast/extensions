import type { ToolId } from "../io/tools";
import type { ImageInfo } from "./image";

export type TranscodePlan = {
  tool: ToolId;
  args: (source: string, output: string) => string[];
};

export function targetFormat(animated: boolean): "gif" | "png" {
  return animated ? "gif" : "png";
}

export function needsTranscode(
  info: ImageInfo | undefined,
  targetHeight: number,
  animated: boolean,
): boolean {
  if (!info) return true;
  return info.height !== targetHeight || info.format !== targetFormat(animated);
}

export function planTranscode(
  info: ImageInfo | undefined,
  targetHeight: number,
  animated: boolean,
): TranscodePlan {
  if (info?.format === "webp" && animated) {
    return {
      tool: "magick",
      args: (source, output) => [
        source,
        "-coalesce",
        "-resize",
        `x${targetHeight}`,
        "-layers",
        "optimize",
        output,
      ],
    };
  }

  const scale = `scale=-1:${targetHeight}:flags=lanczos`;
  const filter = animated
    ? `${scale},split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128`
    : scale;

  return {
    tool: "ffmpeg",
    args: (source, output) => [
      "-y",
      "-i",
      source,
      "-vf",
      filter,
      ...(animated ? ["-loop", "0"] : []),
      output,
    ],
  };
}
