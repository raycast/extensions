import { getPreferenceValues, LocalStorage, openExtensionPreferences } from "@raycast/api";
import { readCliConfig, resolveCliConnection } from "./cli-config";

export interface SynapPreferences {
  podUrl: string;
  apiKey: string;
  workspaceId?: string;
  /** Credential posture set only by the managed Raycast-agent connection flow. */
  keySource?: "agent" | "pod";
}

/** Where the active credentials came from — determines which fix actually helps on failure. */
export type ConnectionSource = "cli" | "oauth" | "prefs";

export interface SynapConnection extends SynapPreferences {
  source: ConnectionSource;
  /** Pod profile name (CLI source only). */
  podName?: string;
  /** 'agent' = dedicated Raycast agent key, 'pod' = pod profile key (CLI source only). */
  keySource?: "agent" | "pod";
}

const LS_KEY = "synap-connection";
const LS_DISCONNECTED_KEY = "synap-connection-disconnected";

/**
 * Get the active connection config.
 *
 * Priority:
 * 0. ~/.synap/config.json (synap CLI — single source of truth, switches with `synap pods use`)
 * 1. LocalStorage (set automatically via the Synap Cloud OAuth flow)
 * 2. Raycast Preferences (manually entered by user)
 */
export async function getConnection(): Promise<SynapConnection | null> {
  // Tier 0: synap CLI config — source of truth when the user has set up the CLI.
  // `synap pods use <name>` / `synap pods use --surface raycast` write here.
  // resolveCliConnection pins the key to the pod Raycast points at, so
  // switching pods can never mix one pod's credentials with another's URL.
  // Its workspace preference is retained for local UI choices only; API calls
  // are pod-wide unless a caller passes an explicit lens.
  try {
    const config = readCliConfig();
    if (config) {
      const resolved = resolveCliConnection(config, "raycast");
      if (resolved) {
        return {
          podUrl: resolved.podUrl,
          apiKey: resolved.apiKey,
          workspaceId: resolved.workspaceId,
          source: "cli",
          podName: resolved.podName,
          keySource: resolved.keySource,
        };
      }
    }
  } catch {
    // File unreadable — fall through
  }

  // User explicitly disconnected — hard-disables tiers 1+2 until fresh connect.
  try {
    const disconnected = await LocalStorage.getItem<string>(LS_DISCONNECTED_KEY);
    if (disconnected === "1") return null;
  } catch {
    // Ignore storage read failures
  }

  // Tier 1: LocalStorage — written by the Cloud OAuth deeplink callback
  try {
    const stored = await LocalStorage.getItem<string>(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SynapPreferences;
      if (parsed.podUrl && parsed.apiKey) return { ...parsed, source: "oauth", podName: podHost(parsed.podUrl) };
    }
  } catch {
    // Malformed — fall through
  }

  // Tier 2: Raycast Preferences — manually entered
  try {
    const prefs = getPreferenceValues<SynapPreferences>();
    if (prefs.podUrl && prefs.apiKey) return { ...prefs, source: "prefs", podName: podHost(prefs.podUrl) };
  } catch {
    // Preferences not accessible (e.g. during tests)
  }

  return null;
}

/** Display name for pods with no CLI profile name — the URL host is the most recognizable handle. */
function podHost(podUrl: string): string {
  try {
    return new URL(podUrl).hostname;
  } catch {
    return podUrl;
  }
}

/**
 * Save connection credentials to LocalStorage.
 * Called after the Synap Cloud OAuth deeplink callback.
 */
export async function saveConnection(prefs: SynapPreferences): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(LS_KEY, JSON.stringify(prefs)),
    LocalStorage.removeItem(LS_DISCONNECTED_KEY),
  ]);
}

/**
 * Clear saved LocalStorage credentials (e.g. on disconnect).
 */
export async function clearConnection(): Promise<void> {
  await Promise.all([LocalStorage.removeItem(LS_KEY), LocalStorage.setItem(LS_DISCONNECTED_KEY, "1")]);
}

/** Deeplink to this extension’s Connect command (Synap Cloud + self-hosted flows). */
export const RAYCAST_CONNECT_DEEPLINK = "raycast://extensions/AntoineSrvt/synap/connect";

export { openExtensionPreferences };
