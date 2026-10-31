import { call } from "./control";
import type {
  AppsSnapshot,
  AppResolution,
  AppRoutingMode,
  AppRuleKeyKind,
  Explanation,
  Preset,
  Status,
  Target,
} from "./types";

export function getStatus(): Promise<Status> {
  return call<Status>("status");
}

export function setRouting(enabled: boolean): Promise<{ state: string }> {
  return call<{ state: string }>(enabled ? "routing.enable" : "routing.disable", {}, { policy: true });
}

export function toggleRouting(): Promise<{ state: string }> {
  return call<{ state: string }>("routing.toggle", {}, { policy: true });
}

export function retryRouting(): Promise<{ state: string }> {
  return call<{ state: string }>("routing.retry", {}, { policy: true });
}

export async function listTargets(): Promise<Target[]> {
  const data = await call<{ targets: Target[]; count: number }>("targets.list");
  return data.targets;
}

export function addTarget(pattern: string, enabled = true): Promise<{ id: string; pattern: string }> {
  return call<{ id: string; pattern: string }>("targets.add", { pattern, enabled }, { policy: true });
}

export function removeTarget(id: string): Promise<{ removed: number }> {
  return call<{ removed: number }>("targets.remove", { id }, { policy: true });
}

export function updateTarget(
  id: string,
  patch: { pattern?: string; enabled?: boolean },
): Promise<{ id: string; pattern: string; enabled: boolean }> {
  return call<{ id: string; pattern: string; enabled: boolean }>("targets.update", { id, ...patch }, { policy: true });
}

export async function listPresets(): Promise<Preset[]> {
  const data = await call<{ presets: Preset[] }>("presets.list");
  return data.presets;
}

export function applyPreset(name: string): Promise<{ added: number }> {
  return call<{ added: number }>("presets.apply", { name }, { policy: true });
}

export function getApps(): Promise<AppsSnapshot> {
  return call<AppsSnapshot>("apps.list");
}

export function setAppsEnabled(enabled: boolean): Promise<{ enabled: boolean }> {
  return call<{ enabled: boolean }>("apps.setEnabled", { enabled }, { policy: true });
}

export function setAppsDefaultMode(mode: AppRoutingMode): Promise<{ defaultMode: string }> {
  return call<{ defaultMode: string }>("apps.setDefault", { mode }, { policy: true });
}

export function setAppRule(rule: {
  key: string;
  keyKind: AppRuleKeyKind;
  mode: AppRoutingMode;
  enabled?: boolean;
}): Promise<{ id: string }> {
  return call<{ id: string }>("apps.rule.set", { enabled: true, ...rule }, { policy: true });
}

export function removeAppRule(
  target: { id: string } | { key: string; keyKind: AppRuleKeyKind },
): Promise<{ removed: number }> {
  return call<{ removed: number }>("apps.rule.remove", target, { policy: true });
}

export function resolveApp(target: { bundleID?: string; path?: string }): Promise<AppResolution> {
  return call<AppResolution>("apps.resolve", target);
}

export function explainHost(host: string, bundleID?: string): Promise<Explanation> {
  return call<Explanation>("routing.explain", bundleID ? { host, bundleID } : { host });
}

export function openPane(
  pane: "dashboard" | "settings",
  options: { section?: string; revealPattern?: string; revealAppRuleID?: string } = {},
): Promise<{ pane: string }> {
  const args: Record<string, unknown> = { pane };
  if (options.section) args.section = options.section;
  if (options.revealPattern) args.revealPattern = options.revealPattern;
  if (options.revealAppRuleID) args.revealAppRuleID = options.revealAppRuleID;
  return call<{ pane: string }>("ui.open", args);
}
