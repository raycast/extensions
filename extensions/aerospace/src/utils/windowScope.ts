import type { WindowScope } from "./aerospace";

export const WINDOW_SCOPE_STORAGE_KEY = "switch-apps.window-scope";

function isWindowScope(value: unknown): value is WindowScope {
  return value === "focused" || value === "visible" || value === "all";
}

export function resolveWindowScope(...candidates: unknown[]): WindowScope {
  return candidates.find(isWindowScope) ?? "focused";
}
