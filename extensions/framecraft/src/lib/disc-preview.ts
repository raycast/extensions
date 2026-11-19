import fs from "node:fs";
import path from "node:path";
import { prepareDiscSource } from "./disc-source";
import { openRangeSource } from "./range-source";
import { runCommand } from "./command-runner";
import { buildExecutionEnv } from "./env";
import { ScreenshotQueueTask } from "./types";

export async function previewDiscPlaylist(
  task: ScreenshotQueueTask,
  projectDir: string,
  playlist: number,
): Promise<string> {
  const output = path.join(projectDir, `preview-${playlist}.jpg`);
  if (fs.existsSync(output)) return output;
  const copy = structuredClone(task);
  copy.probe.playlist = playlist;
  const source = copy.probe.isRemote ? await openRangeSource(copy.probe.mediaTarget) : undefined;
  let segment: string | undefined;
  try {
    const result = await prepareDiscSource(
      copy,
      source?.url || copy.probe.mediaTarget,
      projectDir,
      () => source?.markLocated(),
      true,
    );
    segment = result.mediaPath;
    await runCommand(
      copy.config.ffmpegPath,
      [
        "-v",
        "error",
        "-y",
        "-copyts",
        "-i",
        segment,
        "-map",
        "0:v:0",
        "-an",
        "-sn",
        "-vf",
        `select=gte(t\\,${result.targetSec.toFixed(6)}),scale=960:-2`,
        "-frames:v",
        "1",
        output,
      ],
      { env: buildExecutionEnv(copy.config.bypassProxy) },
    );
    if (!fs.existsSync(output)) throw new Error("Couldn't read a frame for this version at the target time");
    return output;
  } catch (error) {
    throw new Error(source?.error() || (error instanceof Error ? error.message : String(error)));
  } finally {
    await source?.close();
    if (segment) fs.rmSync(segment, { force: true });
  }
}
