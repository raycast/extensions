import { basename } from "path";
import type {
  Action,
  ActionOrGroup,
  ActionType,
  Group,
  RootConfig,
} from "./types";

export interface GroupDestination {
  label: string;
  path: string[];
}

export interface InferredAction {
  type: Extract<ActionType, "url" | "folder">;
  value: string;
  label: string;
}

export interface CapturedActionInput {
  id: string;
  key: string;
  type: Exclude<ActionType, "command">;
  label?: string;
  value: string;
  browser?: string;
}

export function buildCapturedAction(input: CapturedActionInput): Action {
  return {
    id: input.id,
    key: input.key,
    type: input.type,
    label: input.label || undefined,
    value: input.value,
    ...(input.type === "url" && input.browser
      ? { browser: input.browser }
      : {}),
  };
}

export function flattenGroupDestinations(
  config: RootConfig,
): GroupDestination[] {
  const destinations: GroupDestination[] = [{ label: "Root", path: [] }];

  function isGroup(item: ActionOrGroup): item is Group {
    return item.type === "group";
  }

  function visit(group: RootConfig | Group, path: string[], labels: string[]) {
    for (const item of group.actions) {
      if (!isGroup(item)) {
        continue;
      }

      const childPath = [...path, item.id];
      const childLabels = [...labels, item.label || item.key];
      destinations.push({
        label: childLabels.join(" / "),
        path: childPath,
      });
      visit(item, childPath, childLabels);
    }
  }

  visit(config, [], []);
  return destinations;
}

export function getSuggestedKey(
  label: string,
  group: RootConfig | Group,
): string {
  const usedKeys = new Set(group.actions.map((item) => item.key));
  const normalized = label.toLowerCase();

  for (const character of normalized) {
    if (/^[a-z0-9]$/.test(character) && !usedKeys.has(character)) {
      return character;
    }
  }

  for (const character of "abcdefghijklmnopqrstuvwxyz0123456789") {
    if (!usedKeys.has(character)) {
      return character;
    }
  }

  return "";
}

export function inferActionFromText(
  text: string | undefined,
): InferredAction | null {
  const value = text?.trim();
  if (!value) {
    return null;
  }

  if (isUrl(value)) {
    return {
      type: "url",
      value,
      label: getUrlLabel(value),
    };
  }

  if (looksLikePath(value)) {
    return {
      type: "folder",
      value,
      label: getPathLabel(value),
    };
  }

  return null;
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "raycast:"
    );
  } catch {
    return false;
  }
}

function looksLikePath(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("~/") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    /^\\\\[^\\]+\\[^\\]+/.test(value)
  );
}

export function getUrlLabel(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "raycast:") {
      return "Raycast";
    }
    return url.hostname.replace(/^www\./, "") || value;
  } catch {
    return value;
  }
}

function getPathLabel(value: string): string {
  const normalized = value.replace(/[\\/]+$/, "");
  if (normalized === "~") {
    return "Home";
  }
  return basename(normalized) || normalized;
}
