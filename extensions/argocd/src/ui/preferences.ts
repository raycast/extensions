import { getPreferenceValues } from "@raycast/api";
import { clampPreferences, type NumericPreferences } from "../lib/config/preferences";

interface RawPreferences {
  cacheTtlSeconds?: string;
  requestTimeoutSeconds?: string;
  probeTimeoutSeconds?: string;
  maxResults?: string;
  argocdCliPath?: string;
}

export interface Preferences extends NumericPreferences {
  argocdCliPath: string;
}

export function readPreferences(): Preferences {
  const raw = getPreferenceValues<RawPreferences>();
  const cliPath = raw.argocdCliPath?.trim();
  return {
    ...clampPreferences(raw),
    argocdCliPath: cliPath && cliPath.length > 0 ? cliPath : "argocd",
  };
}
