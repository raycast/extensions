import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const fitCoverPreview = (width: number, height: number) => {
  const scale = Math.min(240 / height, 300 / width, 1);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

export const getCoverPreviewSize = async (path: string, signal?: AbortSignal) => {
  const { stdout } = await run("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], {
    signal,
    timeout: 5000,
  });
  const width = Number(stdout.match(/pixelWidth:\s+(\d+)/)?.[1]);
  const height = Number(stdout.match(/pixelHeight:\s+(\d+)/)?.[1]);
  if (!(width > 0 && height > 0)) throw new Error("Unable to read cover dimensions.");
  return fitCoverPreview(width, height);
};
