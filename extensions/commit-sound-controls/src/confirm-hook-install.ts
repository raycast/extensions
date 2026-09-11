import { confirmAlert } from "@raycast/api";
import {
  getGlobalHooksPath,
  hooksDirectory,
  installOrRepairHook,
} from "./lib/commit-sounds";

export class HookInstallCancelledError extends Error {
  constructor() {
    super("Git hook installation was cancelled.");
    this.name = "HookInstallCancelledError";
  }
}

export function isHookInstallCancelled(error: unknown): boolean {
  return error instanceof HookInstallCancelledError;
}

/**
 * Confirms the exact `core.hooksPath` write, then installs or repairs the hook.
 * Skips the alert when Git already points at this extension's hooks directory.
 */
export async function confirmAndInstallHook(): Promise<void> {
  const configuredHooksPath = await getGlobalHooksPath();
  if (configuredHooksPath && configuredHooksPath !== hooksDirectory) {
    await installOrRepairHook();
    return;
  }

  if (configuredHooksPath !== hooksDirectory) {
    const confirmed = await confirmAlert({
      title: "Set Git core.hooksPath",
      message: `This runs \`git config --global core.hooksPath ${hooksDirectory}\` and applies the Commit Sounds post-commit hook to every Git repository on this computer.`,
      primaryAction: {
        title: "Set core.hooksPath",
      },
    });
    if (!confirmed) {
      throw new HookInstallCancelledError();
    }
  }

  await installOrRepairHook();
}
