import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { detectCliOrApp } from "../detect";
import { execFileAsync } from "../exec";

function commandArgs(request: LaunchRequest): string[] {
  return request.command
    ? ["--", request.shellPath, "-lc", request.command]
    : [];
}

async function startWezTerm(
  cliPath: string,
  request: LaunchRequest,
): Promise<void> {
  await execFileAsync(cliPath, [
    "start",
    "--cwd",
    request.cwd,
    ...commandArgs(request),
  ]);
}

export const weztermLauncher: TerminalLauncher = {
  type: "wezterm",
  title: "WezTerm",
  reuseSupport: "bestEffort",
  checkInstalled(): Promise<TerminalDetection> {
    return detectCliOrApp("wezterm", "WezTerm.app");
  },
  async launch(request: LaunchRequest): Promise<void> {
    const detection = await this.checkInstalled();
    const cliPath = detection.cliPath || "wezterm";

    if (request.reuseWindow) {
      try {
        await execFileAsync(cliPath, [
          "cli",
          "spawn",
          "--cwd",
          request.cwd,
          "--new-window",
          ...commandArgs(request),
        ]);
        return;
      } catch {
        await startWezTerm(cliPath, request);
        return;
      }
    }

    await startWezTerm(cliPath, request);
  },
};
