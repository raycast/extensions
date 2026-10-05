export interface Project {
  name: string;
  path: string;
  parentDirectory: string;
  templateId?: string;
}

export type LauncherKind = "terminal" | "editor" | "script";
export type TerminalType = "warp" | "ghostty" | "iterm" | "cmux";
export type EditorType = string;

export interface WarpTemplate {
  id: string;
  name: string;
  description: string;
  launcherKind: LauncherKind; // Whether the template launches a terminal, editor, or script.
  terminalType?: TerminalType; // Target terminal application.
  editorType?: EditorType; // Target editor application.
  scriptContent?: string; // Bash script content executed with the project path as $1.
  commands: TerminalCommand[];
  splitDirection: "horizontal" | "vertical"; // Currently used by Warp and Ghostty layouts.
  launchMode: "split-panes" | "multi-tab" | "multi-window"; // Controls how new surfaces are created.
  ghosttyAutoRun?: boolean; // Whether Ghostty should auto-run commands via AppleScript.
  isDefault?: boolean;
}

export interface TerminalCommand {
  id: string;
  title: string;
  command: string;
  workingDirectory?: string; // Relative to project root directory, if empty use project root directory
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
