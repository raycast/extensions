import type { CodexModel, ModelSelection } from "./codex";

export const SETUP_KEY = "codex-in-raycast.setup.v1";
export type ConnectionPreferences = {
  codexPath?: string;
  agyPath?: string;
  qoderPath?: string;
  qoderCnPath?: string;
  workbuddyPath?: string;
  geminiPath?: string;
  workingDirectory?: string;
  sandboxMode?: string;
  liveSearch?: boolean;
  autoDetectCli?: boolean;
};
export type Setup = {
  version: 2;
  selection: ModelSelection;
  connection: string;
  checkedAt: number;
};

export function connectionSignature(
  preferences: ConnectionPreferences,
  provider = "codex",
): string {
  // Preserve existing signatures with automatic discovery enabled; disabling it
  // invalidates only connection checks, never chat history or model preference.
  const detection = preferences.autoDetectCli === false ? ["manual-paths"] : [];
  if (provider !== "codex")
    return JSON.stringify([
      provider,
      (
        {
          antigravity: preferences.agyPath,
          qoder: preferences.qoderPath,
          "qoder-cn": preferences.qoderCnPath,
          workbuddy: preferences.workbuddyPath,
          gemini: preferences.geminiPath,
        }[provider] || ""
      ).trim(),
      preferences.workingDirectory?.trim() || "",
      preferences.sandboxMode || "read-only",
      ...detection,
    ]);
  return JSON.stringify([
    preferences.codexPath?.trim() || "",
    preferences.workingDirectory?.trim() || "",
    preferences.sandboxMode || "read-only",
    preferences.liveSearch ?? true,
    ...detection,
  ]);
}

export function parseSetup(raw: string | undefined): Setup | null {
  try {
    const value = JSON.parse(raw || "null");
    if (
      (value?.version !== 1 && value?.version !== 2) ||
      typeof value.selection?.model !== "string" ||
      !value.selection.model.trim() ||
      typeof value.selection?.effort !== "string" ||
      typeof value.connection !== "string" ||
      typeof value.checkedAt !== "number" ||
      !Number.isFinite(value.checkedAt) ||
      value.checkedAt <= 0
    )
      return null;
    // Migrate completed language-era setup without invalidating the verified
    // connection or dropping the model choice. Language is no longer stored.
    return {
      version: 2,
      selection: {
        model: value.selection.model,
        effort: value.selection.effort,
      },
      connection: value.connection,
      checkedAt: value.checkedAt,
    };
  } catch {
    return null;
  }
}

export function validSelection(
  models: CodexModel[],
  selection: ModelSelection,
): boolean {
  const model = models.find((entry) => entry.model === selection.model);
  return Boolean(
    model &&
    (model.efforts.length
      ? model.efforts.includes(selection.effort)
      : selection.effort === ""),
  );
}
