import { execFile } from "child_process";
import { promisify } from "util";
import { executeGcloudCommand } from "../../gcloud";
import { GCloudConfig } from "./types";

const execFilePromise = promisify(execFile);

export async function listConfigurations(gcloudPath: string): Promise<GCloudConfig[]> {
  const result = await executeGcloudCommand(gcloudPath, ["config", "configurations", "list"], undefined, {
    skipCache: true,
  });
  return result as GCloudConfig[];
}

const EXEC_TIMEOUT = 15000;

export async function activateConfiguration(gcloudPath: string, name: string): Promise<void> {
  try {
    await execFilePromise(gcloudPath, ["config", "configurations", "activate", name], { timeout: EXEC_TIMEOUT });
  } catch (error: unknown) {
    // gcloud exits non-zero on warnings (e.g., project mismatch) even when activation succeeded.
    // Check stderr for the success signal before treating it as a real failure.
    const stderr = (error as { stderr?: string }).stderr || "";
    if (stderr.includes(`Activated [${name}]`)) {
      return;
    }
    throw error;
  }
}

export async function deleteConfiguration(gcloudPath: string, name: string): Promise<void> {
  await execFilePromise(gcloudPath, ["config", "configurations", "delete", name, "--quiet"], { timeout: EXEC_TIMEOUT });
}

export async function createConfiguration(
  gcloudPath: string,
  name: string,
  options: { project?: string; account?: string; region?: string },
): Promise<void> {
  // Make idempotent: if config already exists, skip create and just set properties.
  // This handles the case where a previous attempt created the config but failed
  // on a property-setting step — the user retries and it works.
  try {
    await execFilePromise(gcloudPath, ["config", "configurations", "create", name], { timeout: EXEC_TIMEOUT });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.toLowerCase().includes("already exists")) {
      throw error;
    }
  }

  if (options.project) {
    await execFilePromise(gcloudPath, ["config", "set", "project", options.project, `--configuration=${name}`], {
      timeout: EXEC_TIMEOUT,
    });
  }
  if (options.account) {
    await execFilePromise(gcloudPath, ["config", "set", "account", options.account, `--configuration=${name}`], {
      timeout: EXEC_TIMEOUT,
    });
  }
  if (options.region) {
    await execFilePromise(gcloudPath, ["config", "set", "compute/region", options.region, `--configuration=${name}`], {
      timeout: EXEC_TIMEOUT,
    });
  }
}

export async function revokeAllAuth(gcloudPath: string): Promise<void> {
  await execFilePromise(gcloudPath, ["auth", "revoke", "--all", "--quiet"], { timeout: EXEC_TIMEOUT });
}
