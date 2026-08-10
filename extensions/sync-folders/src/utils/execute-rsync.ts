import { execFile } from "child_process";
import { promisify } from "util";
import { SyncFolders } from "../types";

const execFileAsync = promisify(execFile);

export type RsyncResult = {
  success: boolean;
  output: string;
  error?: string;
  warning?: string;
  fileCount?: number;
  duration: number;
};

function buildArgs(sync_folders: SyncFolders, dryRun = false): string[] {
  const args = ["-a", "-E", "--exclude", "._*"];
  if (dryRun) args.push("--dry-run", "--itemize-changes");
  else args.push("--stats");
  if (sync_folders.delete_dest) args.push("--delete");

  if (sync_folders.exclude_patterns) {
    const patterns = sync_folders.exclude_patterns
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const pattern of patterns) {
      args.push("--exclude", pattern);
    }
  }

  args.push(`${sync_folders.source_folder}/`, sync_folders.dest_folder as string);
  return args;
}

function parseFileCount(stdout: string, isDryRun: boolean): number {
  if (isDryRun) {
    return stdout.split("\n").filter((l) => l.trim().length > 0).length;
  }
  const match = stdout.match(/Number of regular files transferred:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function runRsync(args: string[]): Promise<RsyncResult> {
  const start = Date.now();
  const isDryRun = args.includes("--dry-run");
  try {
    const { stdout, stderr } = await execFileAsync("rsync", args, { timeout: 300000 });
    const fileCount = parseFileCount(stdout, isDryRun);
    const warning = stderr && stderr.trim() ? stderr.trim() : undefined;
    return { success: true, output: stdout, warning, fileCount, duration: Date.now() - start };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return {
      success: false,
      output: "",
      error: error.stderr?.trim() || error.message || "Unknown rsync error",
      fileCount: 0,
      duration: Date.now() - start,
    };
  }
}

export async function executeRsync(sync_folders: SyncFolders): Promise<RsyncResult> {
  if (!sync_folders.source_folder || !sync_folders.dest_folder) {
    return {
      success: false,
      output: "",
      error: "Source or destination folder not specified",
      fileCount: 0,
      duration: 0,
    };
  }
  return runRsync(buildArgs(sync_folders, false));
}

export async function executeDryRun(sync_folders: SyncFolders): Promise<RsyncResult> {
  if (!sync_folders.source_folder || !sync_folders.dest_folder) {
    return {
      success: false,
      output: "",
      error: "Source or destination folder not specified",
      fileCount: 0,
      duration: 0,
    };
  }
  return runRsync(buildArgs(sync_folders, true));
}
