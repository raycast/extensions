import type { NormalizedProject, ReuseSupport, TerminalType } from "../types";

export interface TerminalDetection {
  installed: boolean;
  cliPath?: string;
  appPath?: string;
}

export interface LaunchRequest {
  project: NormalizedProject;
  cwd: string;
  command: string | null;
  reuseWindow: boolean;
  shellPath: string;
}

export interface TerminalLauncher {
  type: TerminalType;
  title: string;
  reuseSupport: ReuseSupport;
  checkInstalled(): Promise<TerminalDetection>;
  launch(request: LaunchRequest): Promise<void>;
}
