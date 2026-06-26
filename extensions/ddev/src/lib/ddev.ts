import { Toast, showToast } from "@raycast/api";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DdevDescribeRaw, DdevProject, DdevSnapshot } from "./types";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const PATH_OVERRIDE = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"].join(":");

export const ddevEnv: Record<string, string> = { PATH: PATH_OVERRIDE };

export function parseProjectList(stdout: string): DdevProject[] {
  if (!stdout) return [];
  const parsed = JSON.parse(stdout) as { raw: DdevProject[] | null };
  return parsed.raw ?? [];
}

export function parseDescribe(stdout: string): DdevDescribeRaw | null {
  if (!stdout) return null;
  const parsed = JSON.parse(stdout) as { raw: DdevDescribeRaw | null };
  return parsed.raw ?? null;
}

export function parseSnapshotList(stdout: string, projectName: string): DdevSnapshot[] {
  if (!stdout) return [];
  const parsed = JSON.parse(stdout) as { raw: Record<string, DdevSnapshot[]> | null };
  return parsed.raw?.[projectName] ?? [];
}

export type ToastTitles = { inProgress: string; success: string; failure: string };

async function runDdev(args: string[], toastTitles: ToastTitles, cwd?: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: toastTitles.inProgress });
  try {
    await execFileAsync("ddev", args, {
      env: { ...process.env, PATH: PATH_OVERRIDE },
      cwd,
    });
    toast.style = Toast.Style.Success;
    toast.title = toastTitles.success;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = toastTitles.failure;
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

export async function runShell(command: string, cwd: string, toastTitles: ToastTitles): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: toastTitles.inProgress });
  try {
    await execAsync(command, { env: { ...process.env, PATH: PATH_OVERRIDE }, cwd });
    toast.style = Toast.Style.Success;
    toast.title = toastTitles.success;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = toastTitles.failure;
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

export function startProject(name: string): Promise<void> {
  return runDdev(["start", name], {
    inProgress: `Starting ${name}…`,
    success: `Started ${name}`,
    failure: `Failed to start ${name}`,
  });
}

export function stopProject(name: string): Promise<void> {
  return runDdev(["stop", name], {
    inProgress: `Stopping ${name}…`,
    success: `Stopped ${name}`,
    failure: `Failed to stop ${name}`,
  });
}

export function stopUnlistProject(name: string): Promise<void> {
  return runDdev(["stop", "--unlist", name], {
    inProgress: `Stopping and unlisting ${name}…`,
    success: `Stopped and unlisted ${name}`,
    failure: `Failed to stop and unlist ${name}`,
  });
}

export function restartProject(name: string): Promise<void> {
  return runDdev(["restart", name], {
    inProgress: `Restarting ${name}…`,
    success: `Restarted ${name}`,
    failure: `Failed to restart ${name}`,
  });
}

export async function renameProject(name: string, newName: string, cwd: string): Promise<void> {
  const snapshotName = `${name}-temporary-snapshot`;
  const run = (args: string[]) => execFileAsync("ddev", args, { env: { ...process.env, PATH: PATH_OVERRIDE }, cwd });

  const toast = await showToast({ style: Toast.Style.Animated, title: `Renaming ${name} to ${newName}…` });
  try {
    // 1. Snapshot the current database before tearing the project down.
    toast.title = `Snapshotting ${name}…`;
    await run(["snapshot", "--name", snapshotName]);

    // 2. Stop and unlist the project under its old name.
    toast.title = `Stopping ${name}…`;
    await run(["stop", "--unlist", name]);

    // 3. Apply the new project name.
    toast.title = `Renaming to ${newName}…`;
    await run(["config", "--project-name", newName]);

    // 4. Start the project under its new name.
    toast.title = `Starting ${newName}…`;
    await run(["start"]);

    // 5. Restore the database from the snapshot taken earlier.
    toast.title = `Restoring database…`;
    await run(["snapshot", "restore", snapshotName]);

    // 6. Clean up the temporary snapshot.
    toast.title = `Cleaning up snapshot…`;
    await run(["snapshot", "--cleanup", "--name", snapshotName, "--yes"]);

    toast.style = Toast.Style.Success;
    toast.title = `Renamed ${name} to ${newName}`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to rename ${name}`;
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

export function quickSnapshot(name: string, cwd: string): Promise<void> {
  return runDdev(
    ["snapshot"],
    {
      inProgress: `Taking snapshot of ${name}…`,
      success: `Took snapshot of ${name}`,
      failure: `Failed to take snapshot of ${name}`,
    },
    cwd,
  );
}

export function takeSnapshot(snapshotName: string, cwd: string): Promise<void> {
  return runDdev(
    ["snapshot", "--name", snapshotName],
    {
      inProgress: `Taking snapshot ${snapshotName}…`,
      success: `Took snapshot ${snapshotName}`,
      failure: `Failed to take snapshot ${snapshotName}`,
    },
    cwd,
  );
}

export function restoreSnapshot(snapshotName: string, cwd: string): Promise<void> {
  return runDdev(
    ["snapshot", "restore", snapshotName],
    {
      inProgress: `Restoring snapshot ${snapshotName}…`,
      success: `Restored snapshot ${snapshotName}`,
      failure: `Failed to restore snapshot ${snapshotName}`,
    },
    cwd,
  );
}

export function deleteSnapshot(snapshotName: string, cwd: string): Promise<void> {
  return runDdev(
    ["snapshot", "--cleanup", "--name", snapshotName, "--yes"],
    {
      inProgress: `Deleting snapshot ${snapshotName}…`,
      success: `Deleted snapshot ${snapshotName}`,
      failure: `Failed to delete snapshot ${snapshotName}`,
    },
    cwd,
  );
}

export function importDatabase(name: string, file: string): Promise<void> {
  return runDdev(["import-db", name, "--file", file], {
    inProgress: `Importing into ${name}…`,
    success: `Imported into ${name}`,
    failure: `Failed to import into ${name}`,
  });
}

export function exportDatabase(name: string, file: string, gzip: boolean): Promise<void> {
  return runDdev(["export-db", name, "--file", file, gzip ? "--gzip" : "--gzip=false"], {
    inProgress: `Exporting ${name}…`,
    success: `Exported ${name} to ${file}`,
    failure: `Failed to export ${name}`,
  });
}

export function launchProject(name: string, cwd: string): Promise<void> {
  return runDdev(
    ["launch"],
    {
      inProgress: `Launching ${name}…`,
      success: `Launched ${name}`,
      failure: `Failed to launch ${name}`,
    },
    cwd,
  );
}
