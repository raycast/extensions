import { Cache } from "@raycast/api";

import { resolveCodexResumeDefaults } from "./codex-runtime";
import { ChatSession } from "./types";

export type CodexPersonality = "inherit" | "none" | "friendly" | "pragmatic";
export type CodexModelVerbosity = "inherit" | "low" | "medium" | "high";
export type CodexReasoningSummary = "inherit" | "auto" | "concise" | "detailed" | "none";
export type ClaudeOutputStyle = "inherit" | "Default" | "Proactive" | "Explanatory" | "Learning";
export type ClaudeViewMode = "inherit" | "default" | "verbose" | "focus";

export interface SessionStartupConfiguration {
  modelId?: string;
  effort: string;
  fastMode: boolean;
  codexPersonality: CodexPersonality;
  codexModelVerbosity: CodexModelVerbosity;
  codexReasoningSummary: CodexReasoningSummary;
  claudeOutputStyle: ClaudeOutputStyle;
  claudeViewMode: ClaudeViewMode;
}

const startupConfigurationCache = new Cache({ namespace: "promptcast-startup" });
const configurationVersion = 1;
const personalities: CodexPersonality[] = ["inherit", "none", "friendly", "pragmatic"];
const verbosityLevels: CodexModelVerbosity[] = ["inherit", "low", "medium", "high"];
const reasoningSummaries: CodexReasoningSummary[] = ["inherit", "auto", "concise", "detailed", "none"];
const outputStyles: ClaudeOutputStyle[] = ["inherit", "Default", "Proactive", "Explanatory", "Learning"];
const viewModes: ClaudeViewMode[] = ["inherit", "default", "verbose", "focus"];

interface StoredStartupConfiguration extends Partial<SessionStartupConfiguration> {
  version?: number;
}

export function sessionStartupConfiguration(session: ChatSession): SessionStartupConfiguration {
  const defaults = defaultSessionStartupConfiguration(session);
  try {
    const storedValue = startupConfigurationCache.get(startupConfigurationKey(session));
    if (!storedValue) return defaults;
    const stored = JSON.parse(storedValue) as StoredStartupConfiguration;
    if (!stored || typeof stored !== "object" || stored.version !== configurationVersion) return defaults;
    return sanitizeStartupConfiguration(stored, defaults);
  } catch {
    return defaults;
  }
}

export function saveSessionStartupConfiguration(
  session: ChatSession,
  configuration: SessionStartupConfiguration,
): SessionStartupConfiguration {
  const sanitized = sanitizeStartupConfiguration(configuration, defaultSessionStartupConfiguration(session));
  startupConfigurationCache.set(
    startupConfigurationKey(session),
    JSON.stringify({ version: configurationVersion, ...sanitized }),
  );
  return sanitized;
}

export function defaultSessionStartupConfiguration(session: ChatSession): SessionStartupConfiguration {
  if (session.provider === "codex") {
    const defaults = resolveCodexResumeDefaults(session);
    return {
      modelId: defaults.model || session.model,
      effort: defaults.effort || "high",
      fastMode: Boolean(defaults.fastMode),
      codexPersonality: defaults.personality || "inherit",
      codexModelVerbosity: defaults.modelVerbosity || "high",
      codexReasoningSummary: defaults.reasoningSummary || "auto",
      claudeOutputStyle: "inherit",
      claudeViewMode: "inherit",
    };
  }

  return {
    modelId: session.model || "sonnet",
    effort: "auto",
    fastMode: false,
    codexPersonality: "inherit",
    codexModelVerbosity: "inherit",
    codexReasoningSummary: "inherit",
    claudeOutputStyle: "inherit",
    claudeViewMode: "inherit",
  };
}

function sanitizeStartupConfiguration(
  value: StoredStartupConfiguration,
  defaults: SessionStartupConfiguration,
): SessionStartupConfiguration {
  return {
    modelId: typeof value.modelId === "string" && value.modelId.trim() ? value.modelId.trim() : defaults.modelId,
    effort: typeof value.effort === "string" && value.effort.trim() ? value.effort.trim() : defaults.effort,
    fastMode: typeof value.fastMode === "boolean" ? value.fastMode : defaults.fastMode,
    codexPersonality: includes(personalities, value.codexPersonality)
      ? value.codexPersonality
      : defaults.codexPersonality,
    codexModelVerbosity: includes(verbosityLevels, value.codexModelVerbosity)
      ? value.codexModelVerbosity
      : defaults.codexModelVerbosity,
    codexReasoningSummary: includes(reasoningSummaries, value.codexReasoningSummary)
      ? value.codexReasoningSummary
      : defaults.codexReasoningSummary,
    claudeOutputStyle: includes(outputStyles, value.claudeOutputStyle)
      ? value.claudeOutputStyle
      : defaults.claudeOutputStyle,
    claudeViewMode: includes(viewModes, value.claudeViewMode) ? value.claudeViewMode : defaults.claudeViewMode,
  };
}

function startupConfigurationKey(session: ChatSession): string {
  return `${session.provider}:${session.id}`;
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}
