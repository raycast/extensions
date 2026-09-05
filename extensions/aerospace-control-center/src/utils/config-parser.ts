import { readFile } from "fs/promises";
import { parse } from "smol-toml";
import { resolveConfigPath } from "./aerospace";

export interface Shortcut {
  id: string;
  key: string;
  keyDisplay: string;
  command: string;
  commands: string[];
  category: string;
  description: string;
  mode: string;
}

export function formatKeyDisplay(key: string): string {
  return key
    .split("-")
    .map((part) => {
      switch (part.toLowerCase()) {
        case "alt":
          return "⌥";
        case "shift":
          return "⇧";
        case "ctrl":
          return "⌃";
        case "cmd":
          return "⌘";
        case "space":
          return "Space";
        case "enter":
          return "↩";
        case "tab":
          return "Tab";
        case "esc":
          return "Esc";
        case "backspace":
          return "⌫";
        case "left":
          return "←";
        case "right":
          return "→";
        case "up":
          return "↑";
        case "down":
          return "↓";
        case "minus":
          return "-";
        case "equal":
          return "=";
        case "slash":
          return "/";
        case "backslash":
          return "\\";
        case "semicolon":
          return ";";
        case "comma":
          return ",";
        case "period":
          return ".";
        default:
          return part.toUpperCase();
      }
    })
    .join(" ");
}

function categorizeCommand(command: string): {
  category: string;
  description: string;
} {
  const cmd = command.trim();

  if (/^focus\s+(left|right|up|down|next|prev)/.test(cmd)) {
    const dir = cmd.replace(/^focus\s+/, "");
    const labels: Record<string, string> = {
      left: "Focus left window",
      right: "Focus right window",
      up: "Focus upper window",
      down: "Focus lower window",
      next: "Focus next window",
      prev: "Focus previous window",
    };
    return { category: "Focus", description: labels[dir] ?? `Focus ${dir}` };
  }

  if (/^move\s+(left|right|up|down)/.test(cmd)) {
    const dir = cmd.replace(/^move\s+/, "");
    const labels: Record<string, string> = {
      left: "Move window left",
      right: "Move window right",
      up: "Move window up",
      down: "Move window down",
    };
    return {
      category: "Move Window",
      description: labels[dir] ?? `Move ${dir}`,
    };
  }

  if (/^move-node-to-workspace\s+/.test(cmd)) {
    const ws = cmd.replace(/^move-node-to-workspace\s+/, "");
    return {
      category: "Move to Workspace",
      description: `Move window → Workspace ${ws}`,
    };
  }

  if (/^workspace\s+/.test(cmd)) {
    const ws = cmd.replace(/^workspace\s+/, "");
    return { category: "Workspace", description: `Switch to workspace ${ws}` };
  }

  if (cmd === "workspace-back-and-forth") {
    return {
      category: "Workspace",
      description: "Switch to previous workspace",
    };
  }

  if (/^move-workspace-to-monitor/.test(cmd)) {
    return {
      category: "Workspace",
      description: "Move workspace to next monitor",
    };
  }

  if (/^layout/.test(cmd)) {
    const layouts: Record<string, string> = {
      "layout tiles horizontal vertical": "Tiles layout (H/V)",
      "layout accordion horizontal vertical": "Accordion layout (H/V)",
      "layout floating tiling": "Toggle floating / tiling",
    };
    return { category: "Layout", description: layouts[cmd] ?? cmd };
  }

  if (/^resize/.test(cmd)) {
    const resizes: Record<string, string> = {
      "resize smart -50": "Shrink window",
      "resize smart +50": "Grow window",
    };
    return { category: "Resize", description: resizes[cmd] ?? cmd };
  }

  if (/^join-with/.test(cmd)) {
    const dir = cmd.replace(/^join-with\s+/, "");
    return { category: "Join", description: `Join with ${dir} window` };
  }

  if (cmd === "reload-config") {
    return { category: "Service", description: "Reload AeroSpace config" };
  }

  if (cmd === "flatten-workspace-tree") {
    return { category: "Service", description: "Reset layout (flatten tree)" };
  }

  if (cmd === "close-all-windows-but-current") {
    return {
      category: "Service",
      description: "Close all windows except current",
    };
  }

  if (/^mode\s+/.test(cmd)) {
    const modeName = cmd.replace(/^mode\s+/, "");
    return { category: "Service", description: `Enter mode: ${modeName}` };
  }

  if (/^exec-and-forget/.test(cmd)) {
    return {
      category: "Launch",
      description: cmd.replace(/^exec-and-forget\s+/, ""),
    };
  }

  return { category: "Other", description: cmd };
}

function commandValue(cmd: unknown): string {
  if (typeof cmd === "string" || typeof cmd === "number" || typeof cmd === "boolean") return String(cmd);
  return JSON.stringify(cmd);
}

function resolveCommandString(cmd: unknown): string {
  if (typeof cmd === "string") return cmd;
  if (Array.isArray(cmd)) {
    // Array of commands — pick the meaningful non-mode one for display, show all joined
    return cmd.map(commandValue).join(" + ");
  }
  return commandValue(cmd);
}

export async function parseShortcuts(): Promise<{
  shortcuts: Shortcut[];
  configPath: string | null;
}> {
  const configPath = await resolveConfigPath();
  if (!configPath) return { shortcuts: [], configPath: null };

  const content = await readFile(configPath, "utf-8");
  const config = parse(content) as Record<string, unknown>;

  const shortcuts: Shortcut[] = [];
  const modeSection = config.mode as Record<string, { binding?: Record<string, unknown> }> | undefined;

  if (modeSection) {
    for (const [modeName, modeConfig] of Object.entries(modeSection)) {
      const binding = modeConfig?.binding;
      if (!binding) continue;

      for (const [key, cmd] of Object.entries(binding)) {
        if (cmd == null) continue;

        const commandStr = resolveCommandString(cmd);
        // For categorization use the first command in an array
        const primaryCmd = Array.isArray(cmd) ? commandValue(cmd[0]) : commandValue(cmd);
        const { category, description } = categorizeCommand(primaryCmd);

        const categoryLabel = modeName === "main" ? category : `[${modeName}] ${category}`;

        shortcuts.push({
          id: `${modeName}-${key}`,
          key,
          keyDisplay: formatKeyDisplay(key),
          command: commandStr,
          commands: Array.isArray(cmd) ? cmd.map(commandValue) : [commandValue(cmd)],
          category: categoryLabel,
          description,
          mode: modeName,
        });
      }
    }
  }

  // Sort: main mode first, then by category order, then by key
  const categoryOrder: Record<string, number> = {
    Focus: 1,
    "Move Window": 2,
    Workspace: 3,
    "Move to Workspace": 4,
    Layout: 5,
    Resize: 6,
    Join: 7,
    Service: 8,
    Launch: 9,
    Other: 10,
  };

  shortcuts.sort((a, b) => {
    if (a.mode === "main" && b.mode !== "main") return -1;
    if (a.mode !== "main" && b.mode === "main") return 1;
    const baseCatA = a.category.replace(/^\[.*?\]\s*/, "");
    const baseCatB = b.category.replace(/^\[.*?\]\s*/, "");
    const orderA = categoryOrder[baseCatA] ?? 99;
    const orderB = categoryOrder[baseCatB] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.key.localeCompare(b.key);
  });

  return { shortcuts, configPath };
}
