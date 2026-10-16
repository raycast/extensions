import { isLocale, type Locale } from "./i18n";
import type { CodexModel, ModelSelection } from "./codex";

export const SETUP_KEY = "codex-in-raycast.setup.v1";
export type ConnectionPreferences = {
  codexPath?: string;
  workingDirectory?: string;
  sandboxMode?: string;
  liveSearch?: boolean;
};
export type Setup = {
  version: 1;
  locale: Locale;
  selection: ModelSelection;
  connection: string;
  checkedAt: number;
};

export function connectionSignature(
  preferences: ConnectionPreferences,
): string {
  return JSON.stringify([
    preferences.codexPath?.trim() || "",
    preferences.workingDirectory?.trim() || "",
    preferences.sandboxMode || "read-only",
    preferences.liveSearch ?? true,
  ]);
}

export function parseSetup(raw: string | undefined): Setup | null {
  try {
    const value = JSON.parse(raw || "null");
    if (
      value?.version !== 1 ||
      !isLocale(value.locale) ||
      typeof value.selection?.model !== "string" ||
      !value.selection.model.trim() ||
      typeof value.selection?.effort !== "string" ||
      typeof value.connection !== "string" ||
      typeof value.checkedAt !== "number" ||
      !Number.isFinite(value.checkedAt) ||
      value.checkedAt <= 0
    )
      return null;
    return value as Setup;
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
