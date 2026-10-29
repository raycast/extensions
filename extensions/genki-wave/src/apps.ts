// Apps people most often dictate into, suggested first when choosing where a
// button's dictation goes. Matched by name: bundle ids differ between editions
// (ChatGPT ships as com.openai.codex on some Macs), names are what users see.

type Installed = { name: string; bundleId?: string };

const TERMINAL_AGENTS = "Claude Code, Codex CLI, opencode, pi, herdr";

const SUGGESTIONS: { match: RegExp; why: string }[] = [
  // Agents and AI chat
  { match: /^Claude$/, why: "Anthropic" },
  { match: /^(ChatGPT|Codex)$/, why: "OpenAI" },
  { match: /^T3 Code/, why: "Coding agent GUI" },
  { match: /^OpenCode/, why: "Coding agent GUI" },
  { match: /^Cursor$/, why: "Agent editor" },
  { match: /^Windsurf$/, why: "Agent editor" },
  { match: /^Zed/, why: "Agent editor" },
  { match: /^Visual Studio Code/, why: "Editor" },
  { match: /^Kiro$/, why: "Agent editor" },
  // Chinese assistants and agent editors
  { match: /^(DeepSeek|深度求索)/, why: "DeepSeek" },
  { match: /^(Kimi|月之暗面)/, why: "Moonshot AI" },
  { match: /^(Doubao|豆包)/, why: "ByteDance" },
  { match: /^(Qwen|通义|千问)/, why: "Alibaba" },
  { match: /^(Yuanbao|元宝|腾讯元宝)/, why: "Tencent" },
  { match: /^(ChatGLM|智谱|清言)/, why: "Zhipu" },
  { match: /^Trae/, why: "ByteDance agent editor" },
  { match: /^Qoder/, why: "Alibaba agent editor" },
  { match: /^CodeBuddy/, why: "Tencent agent editor" },
  // Terminals, where command-line agents run
  { match: /^Ghostty$/, why: `Terminal: ${TERMINAL_AGENTS}` },
  { match: /^iTerm/, why: `Terminal: ${TERMINAL_AGENTS}` },
  { match: /^Warp$/, why: `Terminal: ${TERMINAL_AGENTS}` },
  { match: /^(kitty|WezTerm|Alacritty)$/i, why: `Terminal: ${TERMINAL_AGENTS}` },
  { match: /^Terminal$/, why: `Terminal: ${TERMINAL_AGENTS}` },
  // Messages and notes
  { match: /^Slack$/, why: "Messages" },
  { match: /^Messages$/, why: "Messages" },
  { match: /^(WhatsApp|Telegram|Signal|Discord)$/, why: "Messages" },
  { match: /^(WeChat|微信|Lark|Feishu|飞书|DingTalk|钉钉)$/, why: "Messages" },
  { match: /^(Microsoft Teams|Teams)/, why: "Messages" },
  { match: /^Mail$/, why: "Email" },
  { match: /^(Notes|Notion|Obsidian|Bear)$/, why: "Notes" },
];

/** The installed apps worth suggesting, in the order above, each with why it's there. */
export function suggestApps<T extends Installed>(installed: T[]): { app: T; why: string }[] {
  return SUGGESTIONS.flatMap(({ match, why }) =>
    installed.filter((app) => match.test(app.name)).map((app) => ({ app, why })),
  );
}

/** Bundle ids of the apps with windows open, from `lsappinfo list` (no permission needed). */
export function runningApps(listing: string): string[] {
  return listing
    .split(/^\s*\d+\) "/m)
    .filter((block) => /type="Foreground"/.test(block))
    .flatMap((block) => /bundleID="([^"]+)"/.exec(block)?.[1] ?? []);
}
