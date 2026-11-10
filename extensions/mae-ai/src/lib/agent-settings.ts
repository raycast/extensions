import { Preferences } from "./preferences";
import { normalizeAgentUrl } from "./agents/types";
import { createHash } from "node:crypto";

export type AskBackend = "direct" | "hermes" | "openclaw";

export const askBackends = [
  { value: "direct", title: "Direct Model" },
  { value: "hermes", title: "Hermes Agent" },
  { value: "openclaw", title: "OpenClaw Agent" },
] as const;

export interface AgentSettings {
  backend: AskBackend;
  hermesUrl: string;
  openclawUrl: string;
}

export interface SavedAgentSettings extends AgentSettings {
  version?: 2;
  native?: AgentSettings;
}

export async function readAgentSettings(
  read: () => Promise<string | undefined>,
  write: (settings: SavedAgentSettings) => Promise<void>,
  preferences: NativeSettings,
): Promise<SavedAgentSettings | undefined> {
  const raw = await read();
  if (!raw) return undefined;
  const saved = JSON.parse(raw) as SavedAgentSettings;
  if (saved.version === 2) return saved;
  const migrated = prepareAgentSettings(
    effectiveAgentSettings(preferences, saved),
  );
  await write(migrated);
  return migrated;
}

export async function changeAgentBackend(
  backend: AskBackend,
  read: () => Promise<SavedAgentSettings | undefined>,
  write: (settings: SavedAgentSettings) => Promise<void>,
  preferences: NativeSettings,
): Promise<SavedAgentSettings | undefined> {
  const saved = await read();
  const current = effectiveAgentSettings(preferences, saved);
  if (current.backend === backend) return undefined;
  const updated = prepareAgentSettings({ ...current, backend });
  await write(updated);
  return updated;
}

type NativeSettings = Pick<
  Preferences,
  "askBackend" | "hermesUrl" | "openclawUrl"
>;

export function nativeAgentSettings(
  preferences: NativeSettings,
): AgentSettings {
  return {
    backend: preferences.askBackend || "direct",
    hermesUrl: preferences.hermesUrl || "http://127.0.0.1:8642",
    openclawUrl: preferences.openclawUrl || "ws://127.0.0.1:18789",
  };
}

export function effectiveAgentSettings(
  preferences: NativeSettings,
  saved?: SavedAgentSettings,
): AgentSettings {
  const native = nativeAgentSettings(preferences);
  if (!saved) return native;
  if (saved.version === 2 || !saved.native)
    return {
      backend: saved.backend,
      hermesUrl: saved.hermesUrl,
      openclawUrl: saved.openclawUrl,
    };
  const snapshot = nativeSnapshot(native);
  // Import legacy edits only when the host still supplies the removed preference.
  return {
    backend:
      preferences.askBackend !== undefined &&
      snapshot.backend !== saved.native.backend
        ? native.backend
        : saved.backend,
    hermesUrl:
      preferences.hermesUrl !== undefined &&
      snapshot.hermesUrl !== saved.native.hermesUrl
        ? native.hermesUrl
        : saved.hermesUrl,
    openclawUrl:
      preferences.openclawUrl !== undefined &&
      snapshot.openclawUrl !== saved.native.openclawUrl
        ? native.openclawUrl
        : saved.openclawUrl,
  };
}

function nativeSnapshot(settings: AgentSettings): AgentSettings {
  return {
    backend: settings.backend,
    hermesUrl: createHash("sha256").update(settings.hermesUrl).digest("hex"),
    openclawUrl: createHash("sha256")
      .update(settings.openclawUrl)
      .digest("hex"),
  };
}

export function prepareAgentSettings(
  settings: AgentSettings,
): SavedAgentSettings {
  for (const [label, value] of [
    ["Hermes", settings.hermesUrl],
    ["OpenClaw", settings.openclawUrl],
  ]) {
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      continue;
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error(
        `${label}: use a URL without embedded credentials, query, or fragment.`,
      );
    }
  }
  const result: SavedAgentSettings = {
    version: 2,
    backend: settings.backend,
    hermesUrl: settings.hermesUrl,
    openclawUrl: settings.openclawUrl,
  };
  if (settings.backend === "hermes") {
    result.hermesUrl = normalizeAgentUrl("hermes", settings.hermesUrl);
  } else if (settings.backend === "openclaw") {
    result.openclawUrl = normalizeAgentUrl("openclaw", settings.openclawUrl);
  }
  return result;
}
