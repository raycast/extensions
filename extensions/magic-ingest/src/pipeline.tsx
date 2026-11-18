import { showToast, Toast, environment } from "@raycast/api";
import { spawn } from "child_process";
import { writeFile, open } from "fs/promises";
import path from "path";
import { homedir } from "os";
import { VolumeInfo } from "./utils/volumes";
import { newJobId } from "./utils/jobs";

export interface PipelineOptions {
  volumes: VolumeInfo[];
  destParent: string;
  folderName: string;
  targetDates: string[];
  starRating: number | null;
  renameFiles: boolean;
  skipDuplicates: boolean;
  verifyCopy: boolean;
  openPhotoMechanic: boolean;
  ejectCards: boolean;
}

const RUNNER_STDERR_LOG = path.join(homedir(), "Library", "Logs", "raycast-photo-ingest-runner-stderr.log");

/**
 * Launch the ingest pipeline as a detached background process.
 * The runner.mjs script in assets/ runs independently — it survives
 * even if the Raycast extension is closed or killed.
 *
 * Returns the generated job ID so callers can reference the running job
 * (e.g. to open its status view).
 */
export async function runIngestPipeline(opts: PipelineOptions): Promise<string> {
  const jobId = newJobId();
  const configPath = path.join(environment.supportPath, `ingest-config-${jobId}.json`);
  const runnerPath = path.join(environment.assetsPath, "runner.mjs");

  // Write config for the runner
  await writeFile(
    configPath,
    JSON.stringify({
      jobId,
      volumes: opts.volumes.map((v) => ({ path: v.path, name: v.name })),
      destParent: opts.destParent,
      folderName: opts.folderName,
      targetDates: opts.targetDates,
      starRating: opts.starRating,
      renameFiles: opts.renameFiles,
      skipDuplicates: opts.skipDuplicates,
      verifyCopy: opts.verifyCopy,
      openPhotoMechanic: opts.openPhotoMechanic,
      ejectCards: opts.ejectCards,
    }),
    "utf-8",
  );

  // Use the same node binary that's running the extension — bare "node"
  // won't resolve inside Raycast's restricted PATH.
  const nodeBin = process.execPath;

  // Open a log file for stderr so runner startup failures are captured
  const stderrFd = await open(RUNNER_STDERR_LOG, "a");

  // Spawn detached — survives parent process being killed
  const child = spawn(nodeBin, [runnerPath, configPath], {
    detached: true,
    stdio: ["ignore", "ignore", stderrFd.fd],
  });

  child.on("error", async (err) => {
    await showToast({
      style: Toast.Style.Failure,
      title: "Runner failed to start",
      message: String(err),
    });
  });

  child.unref();
  // Close our handle — the child process owns the fd now
  await stderrFd.close();

  await showToast({
    style: Toast.Style.Success,
    title: "Magic Ingest started",
    message: "Running in background",
  });

  return jobId;
}
