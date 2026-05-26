import type {
  TerminalDetection,
  TerminalLauncher,
  LaunchRequest,
} from "../types";
import { detectCliOrApp } from "../detect";
import { execFileAsync } from "../exec";

async function launchWithCli(
  cliPath: string,
  request: LaunchRequest,
): Promise<void> {
  const args = ["--working-directory", request.cwd];
  if (request.command) {
    args.push("-e", request.shellPath, "-lc", request.command);
  }
  await execFileAsync(cliPath, args);
}

async function launchWithOpen(request: LaunchRequest): Promise<void> {
  const args = [
    "-na",
    "Alacritty",
    "--args",
    "--working-directory",
    request.cwd,
  ];
  if (request.command) {
    args.push("-e", request.shellPath, "-lc", request.command);
  }
  await execFileAsync("open", args);
}

export const alacrittyLauncher: TerminalLauncher = {
  type: "alacritty",
  title: "Alacritty",
  reuseSupport: "none",
  checkInstalled(): Promise<TerminalDetection> {
    return detectCliOrApp("alacritty", "Alacritty.app");
  },
  async launch(request: LaunchRequest): Promise<void> {
    const detection = await this.checkInstalled();
    if (detection.cliPath) {
      await launchWithCli(detection.cliPath, request);
      return;
    }

    await launchWithOpen(request);
  },
};
