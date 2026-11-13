import { environment, getPreferenceValues, open, showInFinder, showToast, Toast } from "@raycast/api";
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

type Status =
  | { state: "downloading" | "building"; pid: number }
  | { state: "done" }
  | { state: "failed"; reason: string }
  | { state: "none" };

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
    // A job whose process is gone was killed (e.g. by a restart); treat it as resumable.
    return Number.isInteger(pid) && isAlive(pid) ? { state, pid } : { state: "none" };
  }
  if (state === "done") return { state };
  if (state === "failed") return { state, reason: rest.join(" ") };
  return { state: "none" };
}

function fileSize(file: string): number {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
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

  const jobsDir = path.join(environment.supportPath, "jobs");
  const cacheDir = path.join(environment.supportPath, "cache");
  fs.mkdirSync(jobsDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  const jobId = createHash("sha256").update(dest).digest("hex").slice(0, 16);
  const statusFile = path.join(jobsDir, `${jobId}.status`);
  const logFile = `${statusFile}.log`;
  // ISOs are built from a package kept outside the download folder, which root may not be allowed to read.
  const target = request.buildIso ? path.join(cacheDir, `${jobId}.pkg`) : dest;

  const existing = readStatus(statusFile);
  if (existing.state !== "downloading" && existing.state !== "building") {
    fs.writeFileSync(statusFile, "");
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
    spawn("/bin/sh", args, { detached: true, stdio: "ignore" }).unref();
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
    primaryAction: { title: "Show Download Folder", onAction: () => open(path.dirname(dest)) },
  });

  // The toast only reflects progress while Raycast keeps the command loaded; the download itself carries on.
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
        toast.secondaryAction = {
          title: "Cancel Download",
          onAction: () => {
            // The script runs in its own process group, so this also stops curl.
            try {
              process.kill(-status.pid, "SIGTERM");
            } catch {
              // Already finished.
            }
            fs.rmSync(partial, { force: true });
            fs.writeFileSync(statusFile, "failed Cancelled");
          },
        };
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
      clearInterval(timer);
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = status.reason;
      toast.primaryAction = { title: "Show Log", onAction: () => open(logFile) };
      toast.secondaryAction = undefined;
    }
    lastState = status.state;
  }, 1000);
}
