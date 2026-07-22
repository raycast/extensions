import { DEFAULT_SETTINGS, type QuickShellSettings, type TerminalApplication } from "./schema";
import { isMacPlatform } from "./platform";
import { discoverDefaultProfileChoices } from "./terminal-catalog";

export type TerminalChoice = { id: string; title: string };

const WINDOWS_TERMINAL_APPLICATIONS = new Set<TerminalApplication>(["system", "wt", "conhost", "it"]);
const MAC_TERMINAL_APPLICATIONS = new Set<TerminalApplication>(["system", "terminal", "iterm"]);

/** Allowlist terminal host ids; unknown values fall back to the platform-safe default. */
export function parseTerminalApplication(value: unknown): TerminalApplication {
  if (
    value === "system" ||
    value === "wt" ||
    value === "conhost" ||
    value === "it" ||
    value === "terminal" ||
    value === "iterm"
  ) {
    return normalizeTerminalApplicationForPlatform(value);
  }
  return defaultTerminalApplicationForPlatform();
}

export function defaultTerminalApplicationForPlatform(): TerminalApplication {
  return isMacPlatform() ? "terminal" : DEFAULT_SETTINGS.terminalApplication;
}

/** Map cross-platform preference values to a host that makes sense on the current OS. */
export function normalizeTerminalApplicationForPlatform(value: TerminalApplication): TerminalApplication {
  if (isMacPlatform()) {
    if (MAC_TERMINAL_APPLICATIONS.has(value)) {
      return value === "system" ? "terminal" : value;
    }
    return "terminal";
  }
  if (WINDOWS_TERMINAL_APPLICATIONS.has(value)) {
    return value;
  }
  return DEFAULT_SETTINGS.terminalApplication;
}

export const WORKSPACE_TERMINAL_CHOICES_WINDOWS: TerminalChoice[] = [
  { id: "default", title: "Use Quick Shell default" },
  { id: "wt", title: "Windows Terminal" },
  { id: "powershell", title: "Windows PowerShell" },
  { id: "pwsh", title: "PowerShell 7" },
  { id: "cmd", title: "Command Prompt" },
  { id: "wsl", title: "WSL" },
];

export const WORKSPACE_TERMINAL_CHOICES_MAC: TerminalChoice[] = [
  { id: "default", title: "Use Quick Shell default" },
  { id: "terminal", title: "Terminal" },
  { id: "iterm", title: "iTerm2" },
];

/** Platform-aware workspace launch terminal dropdown. */
export function getWorkspaceTerminalChoices(): TerminalChoice[] {
  return isMacPlatform() ? WORKSPACE_TERMINAL_CHOICES_MAC : WORKSPACE_TERMINAL_CHOICES_WINDOWS;
}

/** @deprecated Prefer getWorkspaceTerminalChoices(); kept for Windows-oriented callers/tests. */
export const WORKSPACE_TERMINAL_CHOICES: TerminalChoice[] = WORKSPACE_TERMINAL_CHOICES_WINDOWS;

export const TERMINAL_APPLICATION_CHOICES_WINDOWS: TerminalChoice[] = [
  { id: "system", title: "Let Windows choose" },
  { id: "wt", title: "Windows Terminal" },
  { id: "conhost", title: "Windows Console Host" },
  { id: "it", title: "Intelligent Terminal" },
];

export const TERMINAL_APPLICATION_CHOICES_MAC: TerminalChoice[] = [
  { id: "system", title: "System default (Terminal)" },
  { id: "terminal", title: "Terminal" },
  { id: "iterm", title: "iTerm2" },
];

export function getTerminalApplicationChoices(): TerminalChoice[] {
  return isMacPlatform() ? TERMINAL_APPLICATION_CHOICES_MAC : TERMINAL_APPLICATION_CHOICES_WINDOWS;
}

/** @deprecated Prefer getTerminalApplicationChoices(). */
export const TERMINAL_APPLICATION_CHOICES: TerminalChoice[] = TERMINAL_APPLICATION_CHOICES_WINDOWS;

const CONHOST_PROFILE_CHOICES: TerminalChoice[] = [
  { id: "__default__", title: "Default profile for this app" },
  { id: "powershell", title: "PowerShell" },
  { id: "pwsh", title: "PowerShell 7" },
  { id: "cmd", title: "Command Prompt" },
];

export function getDefaultProfileChoices(terminalApplication: TerminalApplication): TerminalChoice[] {
  if (terminalApplication === "conhost") {
    return CONHOST_PROFILE_CHOICES;
  }
  if (terminalApplication === "terminal" || terminalApplication === "iterm") {
    return [{ id: "__default__", title: "Default profile for this app" }];
  }
  return discoverDefaultProfileChoices(terminalApplication);
}

export function getWorkspaceProfileChoices(terminal: string): TerminalChoice[] {
  if (terminal === "wt" || terminal === "wsl") {
    return discoverDefaultProfileChoices("wt").filter((choice) => choice.id !== "__default__" || terminal === "wt");
  }
  return [];
}

export function normalizeDefaultProfile(terminalApplication: TerminalApplication, profile: string): string {
  const choices = getDefaultProfileChoices(terminalApplication);
  if (choices.some((choice) => choice.id === profile)) {
    return profile;
  }
  return "__default__";
}

export function settingsSummary(settings: QuickShellSettings): string {
  const choices = getTerminalApplicationChoices();
  const app =
    choices.find((choice) => choice.id === settings.terminalApplication)?.title ??
    TERMINAL_APPLICATION_CHOICES_WINDOWS.find((choice) => choice.id === settings.terminalApplication)?.title ??
    TERMINAL_APPLICATION_CHOICES_MAC.find((choice) => choice.id === settings.terminalApplication)?.title ??
    settings.terminalApplication;
  const profile = settings.defaultProfile === "__default__" ? "default profile" : settings.defaultProfile;
  const multiLaunch =
    isMacPlatform() || settings.multiLaunchPresentation === "separateWindows" ? "separate windows" : "tabs";
  const dirtyGate = settings.blockDirtyBranchSwitch ? "block dirty switch" : "allow dirty switch";
  return `${app} • ${profile} • ${multiLaunch} • ${dirtyGate}`;
}
