import * as api from "./api";
import { modeLabel } from "./presentation";
import type { AppRoutingMode } from "./types";

export interface AppModeTarget {
  name: string;
  bundleId: string;
  mode: AppRoutingMode;
  ruleId: string | null;
  appsEnabled: boolean;
}

/**
 * The one action worth pressing Enter on: flip between the tunnel and direct.
 * `Use targets` stays explicit in the panel because a blind toggle cannot
 * express three states.
 */
export function primaryAppMode(app: Pick<AppModeTarget, "mode">): {
  title: string;
  mode: AppRoutingMode;
} {
  return app.mode === "TUNNEL"
    ? { title: "Bypass the Tunnel", mode: "DIRECT" }
    : { title: "Route Through the Tunnel", mode: "TUNNEL" };
}

/** Upserts a BUNDLE rule, turning per-app routing on first when it was off. */
export async function setAppMode(
  app: { name: string; bundleId: string },
  mode: AppRoutingMode,
  options: { appsEnabled: boolean },
): Promise<string> {
  const enabling = !options.appsEnabled;
  if (enabling) await api.setAppsEnabled(true);
  await api.setAppRule({ key: app.bundleId, keyKind: "BUNDLE", mode });

  const message = `${app.name}: ${modeLabel(mode)}`;
  return enabling ? `Per-app routing on · ${message}` : message;
}

export async function removeAppRuleFor(app: AppModeTarget): Promise<string> {
  if (app.ruleId) await api.removeAppRule({ id: app.ruleId });
  else await api.removeAppRule({ key: app.bundleId, keyKind: "BUNDLE" });
  return `${app.name}: rule removed`;
}
