import { Icon, type Image } from "@raycast/api";
import { AGENT_KINDS, type AgentKind } from "./types";

const AGENT_TITLES: Record<AgentKind, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  cursor: "Cursor",
  pi: "Pi",
  opencode: "OpenCode",
  copilot: "GitHub Copilot",
  devin: "Devin",
  droid: "Droid",
  kimi: "Kimi",
  amp: "Amp",
  grok: "Grok",
  hermes: "Hermes",
  kilo: "Kilo Code",
  kiro: "Kiro",
  cline: "Cline",
  omp: "OMP",
  mastracode: "MastraCode",
  qodercli: "Qoder CLI",
  maki: "Maki",
  agy: "Agy",
};

const ALIASES: Record<string, AgentKind> = {
  claudecode: "claude",
  claude_code: "claude",
  geminicli: "gemini",
  gemini_cli: "gemini",
  cursoragent: "cursor",
  cursor_agent: "cursor",
  open_code: "opencode",
  githubcopilot: "copilot",
  github_copilot: "copilot",
  kimi_code: "kimi",
  hermesagent: "hermes",
  hermes_agent: "hermes",
  kilocode: "kilo",
  kilo_code: "kilo",
  mastra: "mastracode",
  mastra_code: "mastracode",
  qoder: "qodercli",
  qoder_cli: "qodercli",
};

const AGENT_ICONS: Partial<Record<AgentKind, Image.ImageLike>> = {
  claude: asset("agents/claude.png"),
  codex: asset("agents/codex.png"),
  gemini: asset("agents/gemini.png"),
  cursor: themedAsset("cursor"),
  pi: themedAsset("pi", "svg"),
  opencode: themedAsset("opencode"),
  copilot: themedAsset("copilot"),
  kimi: asset("agents/kimi.png"),
  amp: asset("agents/amp.png"),
  grok: themedAsset("grok"),
  hermes: themedAsset("hermes"),
  kilo: themedAsset("kilo"),
  cline: themedAsset("cline"),
  mastracode: themedAsset("mastracode"),
  qodercli: asset("agents/qodercli.png"),
};

function asset(source: Image.Source): Image.ImageLike {
  return { source, fallback: Icon.Person };
}

function themedAsset(name: string, extension = "png"): Image.ImageLike {
  return asset({
    light: `agents/${name}-light.${extension}`,
    dark: `agents/${name}-dark.${extension}`,
  });
}

export function normalizeAgentKind(value?: string): AgentKind | undefined {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if ((AGENT_KINDS as readonly string[]).includes(normalized)) return normalized as AgentKind;
  return ALIASES[normalized] ?? ALIASES[normalized.replaceAll("_", "")];
}

export function agentTitle(value?: string): string {
  const kind = normalizeAgentKind(value);
  if (kind) return AGENT_TITLES[kind];
  if (!value?.trim()) return "Agent";
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function agentIcon(value?: string): Image.ImageLike {
  const kind = normalizeAgentKind(value);
  return (kind && AGENT_ICONS[kind]) || Icon.Person;
}
