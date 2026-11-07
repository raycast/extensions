import { Icon, getPreferenceValues } from "@raycast/api";

export type Agent = {
  id: string;
  name: string;
  command: string;
  args: string;
  icon: Icon;
  description: string;
  env?: string;
  resumeArgs?: string;
  headlessArgsTemplate?: string;
};

export type PromptTemplate = {
  id: string;
  title: string;
  prompt: string;
};

function preferences(): Preferences.Vibe {
  return getPreferenceValues<Preferences.Vibe>();
}

export function agents(): Agent[] {
  const p = preferences();
  const result: Agent[] = [];
  if (p.claudeEnabled && p.claudeCommand.trim())
    result.push({
      id: "claude",
      name: "Claude Code",
      command: p.claudeCommand.trim(),
      args: p.claudeArgs || "",
      env: p.claudeEnv || "",
      icon: Icon.Stars,
      description: "Start Claude Code in this folder",
      resumeArgs: "--continue",
      headlessArgsTemplate: '-p "{{prompt}}"',
    });
  if (p.codexEnabled && p.codexCommand.trim())
    result.push({
      id: "codex",
      name: "Codex",
      command: p.codexCommand.trim(),
      args: p.codexArgs || "",
      env: p.codexEnv || "",
      icon: Icon.Code,
      description: "Start Codex CLI in this folder",
      resumeArgs: "resume",
      headlessArgsTemplate: 'exec "{{prompt}}"',
    });
  if (p.geminiEnabled && p.geminiCommand.trim())
    result.push({
      id: "gemini",
      name: "Gemini CLI",
      command: p.geminiCommand.trim(),
      args: p.geminiArgs || "",
      env: p.geminiEnv || "",
      icon: Icon.Stars,
      description: "Start Gemini CLI in this folder",
      headlessArgsTemplate: '-p "{{prompt}}"',
    });
  const customAgents = [
    [
      "custom",
      p.customEnabled,
      p.customName,
      p.customCommand,
      p.customArgs,
      p.customEnv,
    ],
    [
      "custom2",
      p.custom2Enabled,
      p.custom2Name,
      p.custom2Command,
      p.custom2Args,
      p.custom2Env,
    ],
    [
      "custom3",
      p.custom3Enabled,
      p.custom3Name,
      p.custom3Command,
      p.custom3Args,
      p.custom3Env,
    ],
  ] as const;
  for (const [id, enabled, name, command, args, env] of customAgents) {
    if (enabled && command.trim())
      result.push({
        id,
        name: name.trim() || "Custom Agent",
        command: command.trim(),
        args: args || "",
        env: env || "",
        icon: Icon.Terminal,
        description: `Start ${name.trim() || "custom agent"} in this folder`,
      });
  }
  result.push({
    id: "terminal",
    name: "Open Terminal",
    command: "",
    args: "",
    icon: Icon.Terminal,
    description: "Open a shell in this folder",
  });
  return result;
}

export function parseEnvLines(env: string | undefined): Record<string, string> {
  if (!env) return {};
  const result: Record<string, string> = {};
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    result[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }
  return result;
}

export function splitArgs(argsText: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const char of argsText) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        result.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) result.push(current);
  return result;
}

export function pickHeadlessAgent(
  candidates: Agent[],
  lastAgentId: string | undefined,
): Agent | undefined {
  const capable = candidates.filter((a) => a.headlessArgsTemplate);
  if (lastAgentId) {
    const last = capable.find((a) => a.id === lastAgentId);
    if (last) return last;
  }
  const priority = ["claude", "codex", "gemini"];
  for (const id of priority) {
    const match = capable.find((a) => a.id === id);
    if (match) return match;
  }
  return capable[0];
}
