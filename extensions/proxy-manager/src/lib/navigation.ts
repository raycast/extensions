import { launchCommand, LaunchType, open } from "@raycast/api";
import * as api from "./api";
import { isProxyManagerError } from "./control";
import { appPath } from "./preferences";

/** Launches Proxy Manager (or brings the running copy to the front). */
export async function openProxyManager(): Promise<void> {
  await open(appPath());
}

function url(action: string, query: Record<string, string> = {}): string {
  const params = new URLSearchParams(query).toString();
  return `proxymanager://v1/${action}${params ? `?${params}` : ""}`;
}

/**
 * The URL scheme is the only channel that works when external control is off,
 * so every "show me this in the app" action falls back to it.
 */
async function openInApp(
  action: string,
  query: Record<string, string>,
  socketAction?: () => Promise<unknown>,
): Promise<void> {
  if (socketAction) {
    try {
      await socketAction();
      return;
    } catch (error) {
      if (!isProxyManagerError(error)) throw error;
    }
  }
  await open(url(action, query));
}

export function openDashboard(): Promise<void> {
  return openInApp("ui/open", { pane: "dashboard" }, () => api.openPane("dashboard"));
}

export function openSettings(section?: string): Promise<void> {
  return openInApp("ui/open", section ? { pane: "settings", section } : { pane: "settings" }, () =>
    api.openPane("settings", { section }),
  );
}

export function revealTarget(pattern: string): Promise<void> {
  return openInApp("ui/open", { pane: "settings", section: "targets", revealPattern: pattern }, () =>
    api.openPane("settings", { section: "targets", revealPattern: pattern }),
  );
}

export function revealAppRule(id: string): Promise<void> {
  return openInApp("ui/open", { pane: "settings", section: "apps", revealAppRuleID: id }, () =>
    api.openPane("settings", { section: "apps", revealAppRuleID: id }),
  );
}

/** Opens another command of this extension, keeping one list per job. */
export async function goToCommand(
  name: "add-target" | "explain-host" | "app-routing" | "toggle-routing" | "index",
  args?: { host?: string },
): Promise<void> {
  await launchCommand({
    name,
    type: LaunchType.UserInitiated,
    ...(args ? { arguments: args } : {}),
  });
}
