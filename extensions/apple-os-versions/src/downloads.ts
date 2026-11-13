import {
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { spawn } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

export type DownloadRequest = {
  url: string;
  // Saved under this name in the download folder.
  fileName: string;
  title: string;
  size?: number;
  sha256?: string;
  // Download the .pkg to the cache, then build a bootable ISO named `fileName` from it.
  buildIso?: boolean;
};

export type Status =
  | { state: "downloading" | "building"; pid: number }
  | { state: "done" }
  | { state: "failed"; reason: string }
  // The worker died without writing a final status (killed, crashed, or the Mac restarted).
  | { state: "stopped" }
  // No status written yet: never started, or the worker hasn't reached its first line.
  | { state: "none" };

// How long a freshly spawned worker gets to write its first status before it counts as stopped.
const START_TIMEOUT_MS = 15_000;

// Saved next to each job's status file when it starts, so the Downloads list can show and retry it.
type JobInfo = {
  request: DownloadRequest;
  dest: string;
  target: string;
  startedAt: number;
};

export type Job = JobInfo & {
  id: string;
  status: Status;
  // Bytes on disk so far (the partial file while downloading).
  downloadedBytes: number;
  statusFile: string;
  logFile: string;
  partial: string;
};

function jobsDirectory(): string {
  return path.join(environment.supportPath, "jobs");
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

export function downloadDirectory(): string {
  const { downloadDirectory } = getPreferenceValues<Preferences>();
  const value = downloadDirectory?.trim() || "~/Downloads";
  return value === "~" || value.startsWith("~/") ? path.join(os.homedir(), value.slice(1)) : value;
}

// Keeps names usable as a single path component.
export function safeFileName(name: string): string {
  return (
    name
      .replace(/[/:\\]/g, "-")
      .replace(/^\.+/, "")
      .trim() || "download"
  );
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readStatus(file: string): Status {
  let line: string;
  try {
    line = fs.readFileSync(file, "utf8").trim();
  } catch {
    return { state: "none" };
  }
  const [state, ...rest] = line.split(" ");
  if (state === "downloading" || state === "building") {
    const pid = Number(rest[0]);
    return Number.isInteger(pid) && isAlive(pid) ? { state, pid } : { state: "stopped" };
  }
  if (state === "done") return { state };
  if (state === "failed") return { state, reason: rest.join(" ") };
  return { state: "none" };
}

// The lock holds the worker's PID. An empty lock was just claimed by a caller that is about to write it.
function isStaleLock(lockFile: string): boolean {
  try {
    const content = fs.readFileSync(lockFile, "utf8").trim();
    if (!content) return Date.now() - fs.statSync(lockFile).mtimeMs > START_TIMEOUT_MS;
    const pid = Number(content);
    return !Number.isInteger(pid) || !isAlive(pid);
  } catch {
    // Released between the failed claim and this check, so it's free to claim again.
    return true;
  }
}

// Moves a stale lock out of the way. If another caller replaced it with a live lock in the meantime,
// that lock is put back (linking never overwrites) instead of being deleted.
function removeStaleLock(lockFile: string) {
  const aside = `${lockFile}.stale-${process.pid}-${Date.now()}`;
  try {
    fs.renameSync(lockFile, aside);
  } catch {
    return; // Another caller already moved it.
  }
  if (!isStaleLock(aside)) {
    try {
      fs.linkSync(aside, lockFile);
    } catch {
      // A newer lock already took its place.
    }
  }
  fs.rmSync(aside, { force: true });
}

// Claims a job atomically: creating the lock fails if another caller already holds it.
function claimLock(lockFile: string): boolean {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.closeSync(fs.openSync(lockFile, "wx"));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || !isStaleLock(lockFile)) return false;
      removeStaleLock(lockFile);
    }
  }
  return false;
}

function fileSize(file: string): number {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

// A worker that has already reported failure may still hold the lock for a moment while it exits.
// A retry waits briefly for that instead of attaching to the finished job and doing nothing.
async function claimLockForStart(lockFile: string, statusFile: string): Promise<boolean> {
  const deadline = Date.now() + 3000;
  while (!claimLock(lockFile)) {
    const status = readStatus(statusFile);
    const finished = status.state === "failed" || status.state === "done";
    if (!finished || Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return true;
}

export async function startDownload(request: DownloadRequest) {
  const directory = downloadDirectory();
  if (!fs.existsSync(directory)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Download Folder Not Found",
      message: directory,
    });
    return;
  }

  const dest = path.join(directory, safeFileName(request.fileName));
  if (fs.existsSync(dest)) {
    await showToast({
      style: Toast.Style.Success,
      title: "Already Downloaded",
      message: path.basename(dest),
      primaryAction: { title: "Show in Finder", onAction: () => showInFinder(dest) },
    });
    return;
  }

  const jobsDir = jobsDirectory();
  const cacheDir = path.join(environment.supportPath, "cache");
  fs.mkdirSync(jobsDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  const jobId = createHash("sha256").update(dest).digest("hex").slice(0, 16);
  const statusFile = path.join(jobsDir, `${jobId}.status`);
  const logFile = `${statusFile}.log`;
  // ISOs are built from a package kept outside the download folder, which root may not be allowed to read.
  const target = request.buildIso ? path.join(cacheDir, `${jobId}.pkg`) : dest;

  // Only the caller that claims the lock starts a worker; everyone else just follows its progress.
  const lockFile = `${statusFile}.lock`;
  if (await claimLockForStart(lockFile, statusFile)) {
    fs.writeFileSync(statusFile, "");
    const info: JobInfo = { request, dest, target, startedAt: Date.now() };
    fs.writeFileSync(path.join(jobsDir, `${jobId}.json`), JSON.stringify(info));
    const args = [
      path.join(environment.assetsPath, "download.sh"),
      request.url,
      target,
      request.size ? String(request.size) : "",
      request.sha256 ?? "",
      statusFile,
      request.title,
      request.buildIso ? dest : "",
    ];
    // Detached so the download keeps going after Raycast unloads the command.
    const child = spawn("/bin/sh", args, { detached: true, stdio: "ignore" });
    child.unref();
    // The worker deletes the lock when it exits; if it never started, release it here.
    if (child.pid) fs.writeFileSync(lockFile, String(child.pid));
    else fs.rmSync(lockFile, { force: true });
  }

  await trackProgress({ request, dest, target, statusFile, logFile });
}

async function trackProgress(job: {
  request: DownloadRequest;
  dest: string;
  target: string;
  statusFile: string;
  logFile: string;
}) {
  const { request, dest, statusFile, logFile } = job;
  const partial = `${job.target}.download`;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: request.buildIso ? "Downloading Installer" : "Downloading",
    message: path.basename(dest),
    primaryAction: { title: "Show Downloads", onAction: showDownloads },
  });

  const showFailure = (title: string, message: string) => {
    clearInterval(timer);
    toast.style = Toast.Style.Failure;
    toast.title = title;
    toast.message = message;
    // A retry resumes from the partial file, so nothing already downloaded is lost.
    toast.primaryAction = { title: "Retry", onAction: () => startDownload(request) };
    toast.secondaryAction = { title: "Show Log", onAction: () => open(logFile) };
  };

  // The toast only reflects progress while Raycast keeps the command loaded; the download itself carries on.
  const startedAt = Date.now();
  let lastState = "";
  const timer = setInterval(() => {
    const status = readStatus(statusFile);
    if (status.state === "downloading") {
      const done = fileSize(partial);
      const total = request.size;
      toast.message = total
        ? `${Math.min(99, Math.floor((done / total) * 100))}% · ${formatBytes(done)} of ${formatBytes(total)}`
        : formatBytes(done);
      if (lastState !== "downloading") {
        toast.secondaryAction = { title: "Cancel Download", onAction: () => cancelDownload({ statusFile, partial }) };
      }
    } else if (status.state === "building") {
      if (lastState !== "building") {
        toast.title = "Building Installer ISO";
        toast.message = "Enter your password when asked. This can take several minutes.";
        toast.secondaryAction = undefined;
      }
    } else if (status.state === "done") {
      clearInterval(timer);
      toast.style = Toast.Style.Success;
      toast.title = "Download Complete";
      toast.message = path.basename(dest);
      toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(dest) };
      toast.secondaryAction = undefined;
    } else if (status.state === "failed") {
      showFailure("Download Failed", status.reason);
    } else if (status.state === "stopped") {
      showFailure("Download Stopped", "The download process ended unexpectedly");
    } else if (Date.now() - startedAt > START_TIMEOUT_MS) {
      showFailure("Download Didn't Start", "The download process never reported its status");
    }
    lastState = status.state;
  }, 1000);
}

// Opens the Downloads command; it can be launched from anywhere, including a toast.
export async function showDownloads() {
  try {
    await launchCommand({ name: "pomme-downloads", type: LaunchType.UserInitiated });
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't Open Downloads" });
  }
}

// Stops a download in progress. The status is read again at the moment of cancelling: the worker may
// have moved on (to building as root, or finished) since the action was shown, and only a live
// download is cancelled.
export function cancelDownload({ statusFile, partial }: { statusFile: string; partial: string }): boolean {
  const current = readStatus(statusFile);
  if (current.state !== "downloading") return false;
  // The script runs in its own process group, so this also stops curl.
  try {
    process.kill(-current.pid, "SIGTERM");
  } catch {
    // Already finished.
  }
  fs.rmSync(partial, { force: true });
  fs.writeFileSync(statusFile, "failed Cancelled");
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The info file is our own, but it is still parsed defensively: a malformed one is skipped.
function readJobInfo(file: string): JobInfo | undefined {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!isRecord(value) || !isRecord(value.request)) return undefined;
    const { request, dest, target, startedAt } = value;
    if (typeof request.url !== "string" || typeof request.fileName !== "string" || typeof request.title !== "string")
      return undefined;
    if (typeof dest !== "string" || typeof target !== "string" || typeof startedAt !== "number") return undefined;
    return {
      request: {
        url: request.url,
        fileName: request.fileName,
        title: request.title,
        size: typeof request.size === "number" ? request.size : undefined,
        sha256: typeof request.sha256 === "string" ? request.sha256 : undefined,
        buildIso: request.buildIso === true,
      },
      dest,
      target,
      startedAt,
    };
  } catch {
    return undefined;
  }
}

// Every download started from this extension, newest first.
export function listJobs(): Job[] {
  let names: string[];
  try {
    names = fs.readdirSync(jobsDirectory());
  } catch {
    return [];
  }
  return names
    .filter((name) => /^[0-9a-f]{16}\.json$/.test(name))
    .flatMap((name) => {
      const id = name.slice(0, 16);
      const info = readJobInfo(path.join(jobsDirectory(), name));
      if (!info) return [];
      const statusFile = path.join(jobsDirectory(), `${id}.status`);
      const partial = `${info.target}.download`;
      let status = readStatus(statusFile);
      // A worker that never wrote its first status within the start window isn't coming back.
      if (status.state === "none" && Date.now() - info.startedAt > START_TIMEOUT_MS) status = { state: "stopped" };
      const downloadedBytes =
        status.state === "done" ? fileSize(info.dest) : fileSize(partial) || fileSize(info.target);
      return { ...info, id, status, downloadedBytes, statusFile, logFile: `${statusFile}.log`, partial };
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function isActive(job: Job): boolean {
  return job.status.state === "downloading" || job.status.state === "building" || job.status.state === "none";
}

// Removes a job from the list. Unfinished jobs also lose their partial data, including the cached
// installer package of a failed ISO build. A finished download's file is never touched.
export function removeJob(job: Job) {
  if (isActive(job)) return;
  if (job.status.state !== "done") {
    fs.rmSync(job.partial, { force: true });
    if (job.request.buildIso) fs.rmSync(job.target, { force: true });
  }
  for (const file of [path.join(jobsDirectory(), `${job.id}.json`), job.statusFile, job.logFile]) {
    fs.rmSync(file, { force: true });
  }
}

// Size of the data that removing an unfinished job would delete.
export function partialDataSize(job: Job): number {
  if (job.status.state === "done") return 0;
  return fileSize(job.partial) + (job.request.buildIso ? fileSize(job.target) : 0);
}
