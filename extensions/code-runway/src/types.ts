export interface Project {
  name: string;
  path: string;
  parentDirectory: string;
  templateId?: string;
}

export interface WarpTemplate {
  id: string;
  name: string;
  description: string;
  commands: TerminalCommand[];
  splitDirection: "horizontal" | "vertical";
  launchMode: "split-panes" | "multi-tab" | "multi-window";
  isDefault?: boolean;
}

export interface TerminalCommand {
  id: string;
  title: string;
  command: string;
  workingDirectory?: string; // 相对于项目根目录，如果为空则使用项目根目录
}

export interface ProjectDirectory {
  name: string;
  path: string;
  enabled: boolean;
  recursive?: boolean;
}

export interface DisplayProjectDirectory extends ProjectDirectory {
  projectCount?: number;
  hasError?: boolean;
}

export interface WarpLaunchConfig {
  name: string;
  windows: WarpWindow[];
}

export interface WarpWindow {
  tabs: WarpTab[];
}

export interface WarpPane {
  cwd: string;
  commands: { exec: string }[];
}

export interface WarpTab {
  title: string;
  layout: {
    cwd?: string;
    commands?: { exec: string }[];
    split_direction?: "vertical" | "horizontal";
    panes?: WarpPane[];
  };
}
