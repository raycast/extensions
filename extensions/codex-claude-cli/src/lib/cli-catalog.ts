import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatProvider, ChatSession } from "./types";

export interface CliModelOption {
  id: string;
  title: string;
  description: string;
  supportedEfforts: string[];
  defaultEffort: string;
  supportsFast?: boolean;
  selectorIndex?: number;
}

export interface SlashCommandOption {
  command: string;
  title: string;
  description: string;
  category: "Session" | "Workflow" | "Tools" | "Configuration";
  argumentHint?: string;
  opensSelector?: boolean;
  destructive?: boolean;
}

type SlashCommandSpec = Pick<
  SlashCommandOption,
  "command" | "category" | "argumentHint" | "opensSelector" | "destructive"
>;

interface CodexModelCache {
  models?: Array<{
    slug?: string;
    display_name?: string;
    description?: string;
    visibility?: string;
    default_reasoning_level?: string;
    supported_reasoning_levels?: Array<{ effort?: string }>;
    service_tiers?: Array<{ id?: string; name?: string }>;
  }>;
}

const fallbackCodexModels: CliModelOption[] = [
  codexModel("gpt-5.6-sol", "GPT-5.6-Sol", "Frontier model for complex tasks and maximum-quality work.", 0, true),
  codexModel("gpt-5.6-terra", "GPT-5.6-Terra", "Balanced model for everyday work.", 1, true),
  codexModel("gpt-5.6-luna", "GPT-5.6-Luna", "Fast model for clear and repeatable tasks.", 2, true),
  codexModel("gpt-5.5", "GPT-5.5", "Powerful model for coding, research, and complex work.", 3, true),
  codexModel("gpt-5.4", "GPT-5.4", "Strong model for general coding.", 4, true),
  codexModel("gpt-5.4-mini", "GPT-5.4-Mini", "Small, fast, and efficient model.", 5),
  codexModel("gpt-5.3-codex-spark", "GPT-5.3-Codex-Spark", "Ultra-fast coding model.", 6),
];

const claudeModels: CliModelOption[] = [
  {
    id: "fable",
    title: "Claude Fable",
    description: "Alias for the latest Fable generation.",
    supportedEfforts: ["auto", "low", "medium", "high", "xhigh", "max"],
    defaultEffort: "auto",
  },
  {
    id: "opus",
    title: "Claude Opus",
    description: "Alias for the latest Opus model.",
    supportedEfforts: ["auto", "low", "medium", "high", "xhigh", "max"],
    defaultEffort: "auto",
  },
  {
    id: "sonnet",
    title: "Claude Sonnet",
    description: "Alias for the latest Sonnet model.",
    supportedEfforts: ["auto", "low", "medium", "high", "xhigh", "max"],
    defaultEffort: "auto",
  },
  {
    id: "haiku",
    title: "Claude Haiku",
    description: "Alias for the latest Haiku model.",
    supportedEfforts: ["auto", "low", "medium", "high"],
    defaultEffort: "auto",
  },
];

const codexCommandSpecs: SlashCommandSpec[] = [
  { command: "/status", category: "Session" },
  { command: "/usage", category: "Session" },
  { command: "/model", category: "Session", opensSelector: true },
  { command: "/permissions", category: "Session", opensSelector: true },
  { command: "/compact", category: "Session" },
  { command: "/copy", category: "Session" },
  { command: "/diff", category: "Workflow" },
  { command: "/review", category: "Workflow", opensSelector: true },
  { command: "/plan", category: "Workflow" },
  { command: "/goal", category: "Workflow" },
  { command: "/personality", category: "Workflow", opensSelector: true },
  { command: "/agent", category: "Tools", opensSelector: true },
  { command: "/ps", category: "Tools" },
  { command: "/stop", category: "Tools", destructive: true },
  { command: "/apps", category: "Tools", opensSelector: true },
  { command: "/plugins", category: "Tools", opensSelector: true },
  { command: "/skills", category: "Tools", opensSelector: true },
  { command: "/mcp", category: "Tools", argumentHint: "verbose (optional)" },
  { command: "/mention", category: "Tools", opensSelector: true },
  { command: "/hooks", category: "Configuration", opensSelector: true },
  { command: "/memories", category: "Configuration", opensSelector: true },
  { command: "/rename", category: "Configuration" },
  { command: "/raw", category: "Configuration" },
  { command: "/help", category: "Configuration" },
];

const claudeCommandSpecs: SlashCommandSpec[] = [
  { command: "/status", category: "Session" },
  { command: "/usage", category: "Session" },
  { command: "/model", category: "Session", opensSelector: true },
  { command: "/effort", category: "Session", opensSelector: true },
  { command: "/permissions", category: "Session", opensSelector: true },
  { command: "/compact", category: "Session" },
  { command: "/context", category: "Session" },
  { command: "/cost", category: "Session" },
  { command: "/clear", category: "Session", destructive: true },
  { command: "/review", category: "Workflow", opensSelector: true },
  { command: "/plan", category: "Workflow" },
  { command: "/goal", category: "Workflow" },
  { command: "/fast", category: "Workflow" },
  { command: "/agents", category: "Tools", opensSelector: true },
  { command: "/todos", category: "Tools" },
  { command: "/memory", category: "Tools", opensSelector: true },
  { command: "/mcp", category: "Tools", opensSelector: true },
  { command: "/hooks", category: "Tools", opensSelector: true },
  { command: "/add-dir", category: "Tools" },
  { command: "/ide", category: "Tools", opensSelector: true },
  { command: "/config", category: "Configuration", opensSelector: true },
  { command: "/rename", category: "Configuration" },
  { command: "/export", category: "Configuration" },
  { command: "/doctor", category: "Configuration" },
  { command: "/vim", category: "Configuration" },
  { command: "/help", category: "Configuration" },
];

export function loadModelOptions(session: ChatSession, codexRoot: string): CliModelOption[] {
  if (session.provider === "claude") {
    const options = [...claudeModels];
    if (session.model && !options.some((option) => option.id === session.model)) {
      options.unshift({
        id: session.model,
        title: session.model,
        description: "Model recorded in this conversation.",
        supportedEfforts: ["auto", "low", "medium", "high", "xhigh", "max"],
        defaultEffort: "auto",
      });
    }
    return options;
  }

  try {
    const cache = JSON.parse(readFileSync(join(codexRoot, "models_cache.json"), "utf8")) as CodexModelCache;
    const visibleModels = (cache.models || []).filter(
      (model) => model.slug && model.visibility !== "hide" && model.supported_reasoning_levels?.length,
    );
    if (visibleModels.length === 0) return fallbackCodexModels;

    return visibleModels.map((model, selectorIndex) => ({
      id: model.slug as string,
      title: model.display_name || (model.slug as string),
      description: model.description || "Model available in the local Codex catalog.",
      supportedEfforts: (model.supported_reasoning_levels || [])
        .map((level) => level.effort)
        .filter((effort): effort is string => Boolean(effort)),
      defaultEffort: model.default_reasoning_level || "medium",
      supportsFast: (model.service_tiers || []).some(
        (tier) => tier.id === "priority" || tier.name?.toLocaleLowerCase() === "fast",
      ),
      selectorIndex,
    }));
  } catch {
    return fallbackCodexModels;
  }
}

export function slashCommands(provider: ChatProvider): SlashCommandOption[] {
  return (provider === "codex" ? codexCommandSpecs : claudeCommandSpecs).map(command);
}

export function modelEfforts(provider: ChatProvider): string[] {
  return provider === "codex"
    ? ["low", "medium", "high", "xhigh", "max", "ultra"]
    : ["auto", "low", "medium", "high", "xhigh", "max"];
}

export function effortTitle(effort: string): string {
  return (
    {
      auto: "Automatic",
      low: "Low",
      medium: "Medium",
      high: "High",
      xhigh: "Extra high",
      max: "Maximum",
      ultra: "Ultra",
    }[effort] || effort
  );
}

const englishCommandCopy: Record<string, { title: string; description: string; argumentHint?: string }> = {
  "/status": {
    title: "Session status",
    description: "Show the current model, permissions, context, account, and limits.",
  },
  "/usage": { title: "Account usage", description: "View consumption, limits, and available resets." },
  "/model": { title: "Change model and effort", description: "Open the CLI's native model selector." },
  "/effort": { title: "Change effort", description: "Adjust the session's reasoning effort." },
  "/permissions": { title: "Change permissions", description: "Open the session permission selector." },
  "/compact": { title: "Compact context", description: "Summarize the conversation to free context." },
  "/copy": { title: "Copy last response", description: "Copy the latest completed response." },
  "/context": { title: "View context", description: "Show how the context window is being used." },
  "/cost": { title: "View cost", description: "Show the conversation's cost and usage." },
  "/clear": { title: "Clear conversation", description: "Reset the visible conversation context." },
  "/diff": { title: "Review changes", description: "Show the Git diff, including new files." },
  "/review": { title: "Review worktree", description: "Start a review of the current work." },
  "/plan": {
    title: "Enter plan mode",
    description: "Switch the session to planning mode.",
    argumentHint: "Describe the plan you want",
  },
  "/goal": {
    title: "Manage goal",
    description: "View or change the persistent task goal.",
    argumentHint: "Goal or action",
  },
  "/personality": { title: "Change personality", description: "Choose friendly, pragmatic, or none." },
  "/fast": { title: "Toggle Fast mode", description: "Turn the faster inference tier on or off." },
  "/agent": { title: "View subagents", description: "Open the agent thread selector." },
  "/agents": { title: "Manage agents", description: "Open the background agents view." },
  "/ps": { title: "Background terminals", description: "Show session processes and terminals." },
  "/stop": { title: "Stop terminals", description: "Stop all background terminals." },
  "/todos": { title: "View tasks", description: "Show the session task list." },
  "/apps": { title: "Browse apps", description: "Open the available apps and connectors." },
  "/plugins": { title: "Manage plugins", description: "Browse and manage installed plugins." },
  "/skills": { title: "Browse skills", description: "Select a local skill for the task." },
  "/memory": { title: "Edit memory", description: "Open and manage project memory." },
  "/mcp": { title: "Manage MCP servers", description: "Show MCP servers, tools, and authentication." },
  "/mention": { title: "Attach file", description: "Find and attach a file or folder to the next prompt." },
  "/hooks": { title: "Manage hooks", description: "Inspect, trust, or disable configured hooks." },
  "/add-dir": {
    title: "Add directory",
    description: "Grant access to an additional directory.",
    argumentHint: "Directory path",
  },
  "/ide": { title: "Connect IDE", description: "Manage editor integration." },
  "/memories": { title: "Configure memories", description: "Configure memory injection and generation." },
  "/config": { title: "Open configuration", description: "View or change CLI configuration." },
  "/rename": {
    title: "Rename session",
    description: "Assign a recognizable name to the conversation.",
    argumentHint: "New session name",
  },
  "/raw": { title: "Toggle raw output", description: "Switch scrollback between normal and raw output." },
  "/export": { title: "Export conversation", description: "Export the current conversation." },
  "/doctor": { title: "Diagnose Claude", description: "Run Claude Code health checks." },
  "/vim": { title: "Toggle Vim mode", description: "Turn Vim editing in the composer on or off." },
  "/help": { title: "CLI help", description: "Show built-in help and every available command." },
};

function codexModel(
  id: string,
  title: string,
  description: string,
  selectorIndex: number,
  supportsFast = false,
): CliModelOption {
  return {
    id,
    title,
    description,
    supportedEfforts: ["low", "medium", "high", "xhigh"],
    defaultEffort: "medium",
    supportsFast,
    selectorIndex,
  };
}

function command(spec: SlashCommandSpec): SlashCommandOption {
  const copy = englishCommandCopy[spec.command];
  return {
    ...spec,
    title: copy?.title || spec.command,
    description: copy?.description || "Run this command in the active CLI session.",
    argumentHint: spec.argumentHint || copy?.argumentHint,
  };
}
