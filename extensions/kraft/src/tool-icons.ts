import { Icon } from "@raycast/api";
import { ToolMode } from "./runtime/types";
import { ToolDefinition } from "./tools";

export type ToolIconName = string;

function formatIconTitle(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

export const toolIconOptions: { value: ToolIconName; title: string; icon: Icon }[] = Object.entries(Icon)
  .filter((entry): entry is [string, Icon] => typeof entry[1] === "string")
  .map(([value, icon]) => ({
    value,
    title: formatIconTitle(value),
    icon,
  }))
  .sort((left, right) => left.title.localeCompare(right.title));

const TOOL_ICON_MAP: Record<string, Icon> = Object.fromEntries(
  toolIconOptions.map((option) => [option.value, option.icon]),
);

const LEGACY_ICON_NAMES: Record<string, ToolIconName> = {
  command: "CommandSymbol",
  text: "Text",
  sparkles: "Stars",
  wand: "Wand",
  globe: "Globe",
  pencil: "Pencil",
  summary: "TextDocument",
  question: "QuestionMark",
  code: "Code",
  document: "Document",
  chat: "Message",
  bolt: "Bolt",
};

const TOOL_MODE_ICONS: Partial<Record<ToolMode, Icon>> = {
  translate: Icon.Globe,
  polishing: Icon.Pencil,
  summarize: Icon.Text,
  what: Icon.QuestionMark,
};

export function normalizeToolIconName(value: unknown): ToolIconName {
  if (typeof value !== "string") {
    return "Text";
  }
  if (value in TOOL_ICON_MAP) {
    return value;
  }
  return LEGACY_ICON_NAMES[value] ?? "Text";
}

export function getToolIcon(tool: Pick<ToolDefinition, "mode"> & { icon?: ToolIconName }): Icon {
  return (
    (tool.icon && TOOL_ICON_MAP[normalizeToolIconName(tool.icon)]) ||
    (tool.mode && TOOL_MODE_ICONS[tool.mode]) ||
    Icon.CommandSymbol
  );
}
