import { Icon } from "@raycast/api";

// ============================================
// AI CLI Tool Definitions
// ============================================

export interface AIToolDefinition {
  command: string;
  label: string;
  icon: string;
}

export const AI_TOOL_DEFINITIONS: AIToolDefinition[] = [
  {
    command: "claude",
    label: "Claude Code",
    icon: "ai-tools/claude.svg",
  },
  {
    command: "codex",
    label: "Codex CLI",
    icon: "ai-tools/codex.svg",
  },
  {
    command: "gemini",
    label: "Gemini CLI",
    icon: "ai-tools/gemini.svg",
  },
];

// ============================================
// Command Icon Mapping
// ============================================

const COMMAND_ICONS: Record<string, string> = Object.fromEntries(
  AI_TOOL_DEFINITIONS.map((tool) => [tool.command, tool.icon]),
);

/**
 * Get icon for a command (AI tool or custom)
 * Returns the AI tool icon if known, otherwise returns Terminal icon
 */
export function getCommandIcon(command: string | undefined): string | typeof Icon.Terminal | undefined {
  if (!command) return undefined;
  return COMMAND_ICONS[command] ?? Icon.Terminal;
}

/**
 * Known AI tool commands for validation
 */
export const KNOWN_AI_COMMANDS = AI_TOOL_DEFINITIONS.map((tool) => tool.command);
