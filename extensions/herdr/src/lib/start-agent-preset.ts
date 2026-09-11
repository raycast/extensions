import type { AgentDestination } from "./agent-destination";
import { AGENT_KINDS, type AgentKind } from "./types";

export interface StartAgentPreset {
  kind?: AgentKind;
  name?: string;
  destination?: AgentDestination;
  cwd?: string;
  arguments?: string;
  prompt?: string;
  focusAfter?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && (AGENT_KINDS as readonly string[]).includes(value);
}

function isDestination(value: unknown): value is AgentDestination {
  return (
    value === "new-workspace" ||
    value === "split-right" ||
    value === "split-down" ||
    (typeof value === "string" && (value.startsWith("pane:") || value.startsWith("tab:")))
  );
}

export function normalizeStartAgentPreset(value: unknown): StartAgentPreset {
  if (!isRecord(value)) return {};

  const preset: StartAgentPreset = {};
  if (isAgentKind(value.kind)) preset.kind = value.kind;
  if (typeof value.name === "string") preset.name = value.name;
  if (isDestination(value.destination)) preset.destination = value.destination;
  if (typeof value.cwd === "string") preset.cwd = value.cwd;
  if (typeof value.arguments === "string") preset.arguments = value.arguments;
  if (typeof value.prompt === "string") preset.prompt = value.prompt;
  if (typeof value.focusAfter === "boolean") preset.focusAfter = value.focusAfter;
  return preset;
}

export function mergeStartAgentPresets(...values: unknown[]): StartAgentPreset {
  const merged: Record<string, unknown> = {};
  for (const value of values) {
    if (!isRecord(value)) continue;
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined && entry !== "") merged[key] = entry;
    }
  }
  return normalizeStartAgentPreset(merged);
}
