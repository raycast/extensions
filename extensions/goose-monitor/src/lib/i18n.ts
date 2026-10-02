/* UI copy stays independent of @raycast/api so it can be unit-tested. */

export const t = {
  settingsAndTransfer: "Settings & Data Transfer",
  settingsTransfer: "Settings Transfer",
  exportSettings: "Export Portable Settings",
  exportHint: "Copy the JSON into uTools settings",
  copySettings: "Copy Settings",
  copiedSettings: "Settings Copied",
  exportFailed: "Export Failed",
  importClipboard: "Import from Clipboard",
  importHint: "Paste settings JSON exported by uTools or Raycast",
  importSettings: "Import Settings",
  emptyClipboard: "Clipboard is empty",
  importDone: "Import Complete",
  reopenToApply: "Reopen Process Manager to apply changes",
  importFailed: "Import Failed",
  sharedJson: "Shared JSON File",
  currentSource: "Current source",
  preferenceFile: "Raycast preference file",
  overrideFile: "settings override file",
  switchHint: "switch below",
  preference: "Preference",
  override: "Override",
  notSelected: "Not selected",
  pathHint: "Reopen the command after changing Raycast preferences; the two paths are independent.",
  selectExisting: "Select Existing JSON as Override",
  createAtLocation: "Create Override in a Folder",
  usePreference: "Use Raycast Preference File",
  useOverride: "Use Settings Override File",
  createIfAbsent: "Create Only If Missing",
  sharedCreated: "Shared File Created",
  createFailed: "Creation Failed",
  applyLocal: "Apply Local Settings to Shared File",
  sharedUpdated: "Shared Settings Updated",
  notWritten: "Not Written",
  configureShared: "Configure Shared File Path",
  extensionPreferences: "Extension Preferences",
  preferencesHint: "Refresh rate, visible fields, and window behavior",
  openPreferences: "Open Extension Preferences",
  selectSharedFile: "Select Existing Shared Settings File",
  useSelected: "Use Selected File",
  selectJson: "Select a JSON File",
  switchedOverride: "Switched to Override File",
  selectionFailed: "Selection Failed",
  jsonFile: "JSON File",
  chooseFolder: "Choose Folder and Create JSON",
  createShared: "Create Shared File",
  enterJsonName: "Select a folder and enter a .json filename",
  notCreated: "Not Created or Overwritten",
  newFileFolder: "New File Folder",
  newFileName: "New File Name",
  waitingShared: "Waiting to read shared file",
  noSharedPath: "No shared file path configured",
  sharedUnavailable:
    "Shared file not read or unavailable; nothing was written. Create it explicitly or retry in Settings",
  sharedSynced: "Shared settings synchronized",
  notOverwritten: "file was not overwritten",
  sharedNotSaved: "Shared Settings Not Saved",
  sharedConnected: "Shared settings connected",
  sharedFileCreated: "New shared settings file created",
  selectDotJson: "Select a .json file",
  nameDotJson: "Filename must end in .json",
  createdAndSwitched: "Shared settings file created; using the settings override path",
  sharedNotRead: "Shared file has not been read; cannot apply local settings",
  localApplied: "Local settings written to shared file",
  processes: "Processes",
  searchPlaceholder: "Search by name, PID, or port",
  category: "Category",
  noProcesses: "No processes found",
  noProcessesHint: "Try a name, PID, or port",
  all: "All",
  gui: "Apps",
  cpu: "CPU",
  memory: "Memory",
  network: "Network",
  background: "Background",
  quit: "Quit",
  forceQuit: "Force Quit",
  quitHelper: "Quit Helper",
  forceQuitHelper: "Force Quit Helper",
  copyPid: "Copy PID",
  copyPath: "Copy Path",
  showInFinder: "Show in Finder",
  showHelpers: "Show Helpers",
  openActivityMonitor: "Open in Activity Monitor",
  refresh: "Refresh",
  sortByCpu: "Sort by CPU",
  sortByMemory: "Sort by Memory",
  sortByName: "Sort by Name",
  sortByNetwork: "Sort by Network",
  sortByDownload: "Sort by Download",
  sortByUpload: "Sort by Upload",
  protected: "Protected",
  openApp: "Open Goose Monitor",
  user: "User",
  system: "System",
  efficiency: "Efficiency Core",
  performance: "Performance Core",
  pressure: "Pressure",
  appMemory: "App Memory",
  wiredMemory: "Wired Memory",
  compressed: "Compressed",
  available: "Available",
  memUsage: "Memory Usage",
  paging: "Paging",
  swapUsed: "Swap Used",
  otherProcesses: (n: number) => `${n} other processes`,
  reasonPid: "PID 0–1",
  reasonSystem: "System process",
  reasonUser: "Another user",
  roleMain: "Main Process",
  roleGpu: "GPU",
  roleRenderer: "Renderer",
  roleExtension: "Extension",
  roleNetwork: "Network",
  roleCrash: "Crash Reporter",
  roleHelper: "Helper",
  roleChild: "Child Process",
  portLabel: (ports: string) => `Port ${ports}`,
  pidLabel: (pid: number) => `PID ${pid}`,
  helpersNav: (name: string) => `${name} Helpers`,
  protectedWith: (reason: string) => `Protected: ${reason}`,
  download: (rate: string) => `Download ${rate}`,
  upload: (rate: string) => `Upload ${rate}`,
  cpuValue: (value: string) => `CPU ${value}`,
  memoryValue: (value: string) => `Memory ${value}`,
  memPressureTooltip: (mem: string, pressure: string) => `${t.memory} ${mem} · ${t.pressure} ${pressure}`,
  pageRead: (rate: string) => `Read ${rate}`,
  pageWrite: (rate: string) => `Write ${rate}`,
  couldNot: (verb: string, name: string) => `Could not ${verb.toLowerCase()} ${name}`,
  did: (verb: string, name: string) => `${verb} completed: ${name}`,
  couldNotOpenActivityMonitor: "Could not open Activity Monitor",
  killProtected: "Protected process: system-critical or insufficient permissions",
  killChanged: "Process changed, exited, or became protected. Refresh and try again.",
  killTermFailed: "Process did not exit. Try Force Quit.",
  killForceFailed: "Process did not exit after Force Quit.",
  killNone: "No processes were terminated; the target may have changed.",
  killInspectFailed: "Could not inspect processes.",
};

export type Messages = typeof t;

const ROLE_TEXT: Record<string, (strings: Messages) => string> = {
  "Main Process": (strings) => strings.roleMain,
  GPU: (strings) => strings.roleGpu,
  Renderer: (strings) => strings.roleRenderer,
  Extension: (strings) => strings.roleExtension,
  Network: (strings) => strings.roleNetwork,
  "Crash Reporter": (strings) => strings.roleCrash,
  Helper: (strings) => strings.roleHelper,
  Child: (strings) => strings.roleChild,
};

export function formatProtectedReason(reason: string | undefined, strings: Messages = t): string {
  if (reason === "PID 0–1") return strings.reasonPid;
  if (reason === "system process") return strings.reasonSystem;
  if (reason === "another user") return strings.reasonUser;
  return reason ?? "";
}

export function formatHelperRole(role: string, strings: Messages = t): string {
  return ROLE_TEXT[role]?.(strings) ?? role;
}

export function formatKillError(error: string | undefined, strings: Messages = t): string {
  if (!error) return strings.killInspectFailed;
  if (error.startsWith("Protected process:")) return strings.killProtected;
  if (error.startsWith("Target process changed")) return strings.killChanged;
  if (error === "Process did not exit. Try Force Quit.") return strings.killTermFailed;
  if (error === "Process did not exit after Force Quit.") return strings.killForceFailed;
  if (error.startsWith("No processes were terminated")) return strings.killNone;
  if (error === "Failed to inspect processes.") return strings.killInspectFailed;
  return error;
}

export function formatTransferError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
