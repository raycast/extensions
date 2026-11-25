export type DefiWindow = {
  id: number;
  appID?: string;
  appName: string;
  title: string;
  workspace?: { id: string; name?: string; position: number };
  display?: number;
  // 1-based place in the strip; absent for floating windows.
  column?: number;
  row?: number;
  floating: boolean;
  focused: boolean;
};

export type DefiWorkspace = {
  id: string;
  name?: string;
  // SF Symbol name set in [workspaces] icons.
  icon?: string;
  position: number;
  kind: string;
  display: number;
  active: boolean;
  windowCount: number;
  applications: string[];
  // On the display that holds the focus; position suggestions resolve there.
  focusedDisplay: boolean;
};

export class VersionMismatch extends Error {
  received: number;
  supported: number;
  constructor(received: number, supported: number) {
    super(`Defi sent format version ${received}; this extension reads version ${supported}.`);
    this.received = received;
    this.supported = supported;
  }
}

// Fields within a version may grow; a new version may break, so it is refused.
// Output that is not versioned JSON comes from a Defi older than the format, so it reads as version 0.
function versioned(text: string, version: number): Record<string, unknown> {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new VersionMismatch(0, version);
  }
  if (json?.version !== version) throw new VersionMismatch(Number(json?.version) || 0, version);
  return json;
}

export function parseWindows(text: string): DefiWindow[] {
  const { windows } = versioned(text, 1);
  if (!Array.isArray(windows)) return [];
  return windows
    .filter((window) => typeof window?.id === "number")
    .map((window) => ({
      id: window.id,
      appID: window.appID,
      appName: String(window.appName ?? ""),
      title: String(window.title ?? ""),
      workspace: window.workspace,
      display: window.display,
      column: window.column,
      row: window.row,
      floating: window.floating === true,
      focused: window.focused === true,
    }));
}

export function parseWorkspaces(text: string): DefiWorkspace[] {
  const { monitors } = versioned(text, 2);
  if (!Array.isArray(monitors)) return [];
  return monitors.flatMap((monitor) =>
    (Array.isArray(monitor?.workspaces) ? monitor.workspaces : [])
      .filter((workspace: { id?: unknown }) => typeof workspace?.id === "string")
      .map((workspace: Record<string, unknown>) => ({
        id: workspace.id,
        name: workspace.name,
        icon: typeof workspace.icon === "string" ? workspace.icon : undefined,
        position: workspace.position,
        kind: String(workspace.kind ?? ""),
        display: monitor.display,
        active: workspace.active === true,
        windowCount: Number(workspace.windowCount ?? 0),
        applications: Array.isArray(workspace.applications) ? workspace.applications.map(String) : [],
        focusedDisplay: monitor.focused === true,
      })),
  );
}

export function workspaceLabel(workspace: { name?: string; position: number; kind?: string }): string {
  if (workspace.kind === "trailing") return "New Workspace";
  return workspace.name ?? `Workspace ${workspace.position}`;
}
