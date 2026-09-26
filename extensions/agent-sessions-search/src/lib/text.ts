/**
 * Text cleaning shared by all providers. Ideas borrowed from ClaudeCast's
 * cleanUserMessageContent (slash-command reconstruction) and the META_PREFIXES list of
 * heyitaki's search-agent-sessions extension.
 */

const WRAPPER_TAGS = [
  "system-reminder",
  "local-command-caveat",
  "local-command-stdout",
  "local-command-stderr",
  "app-context",
  "permissions instructions",
  "skills_instructions",
  "collaboration_mode",
  "environment_context",
  "recommended_plugins",
  "user_instructions",
  "skill",
  "turn_aborted",
  "ide_opened_file",
  "ide_selection",
  "attached_files",
  "task-notification",
  "command-message",
];

const NOISE_PREFIXES = [
  "Caveat: The messages below were generated",
  "Base directory for this skill:",
  "# AGENTS.md instructions",
  "[Request interrupted",
  "This session is being continued from a previous conversation",
];

const wrapperRegexes = WRAPPER_TAGS.map((tag) => {
  const t = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<${t}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${t}>`, "gi");
});

const COMMAND_RE = /<command-name>([^<]*)<\/command-name>\s*(?:<command-args>([\s\S]*?)<\/command-args>)?/i;

/**
 * Cursor sends the human prompt inside <user_query>, preceded by a <timestamp> and followed by
 * context blocks (git diffs, attached images, the body of a slash command). Only the query is
 * the prompt, so it replaces the whole message when present.
 */
const USER_QUERY_RE = /<user_query>([\s\S]*?)<\/user_query>/gi;

/** Remove injected wrapper blocks and reconstruct slash commands. Returns "" when nothing human remains. */
export function cleanText(raw: string): string {
  if (!raw) return "";
  let text = raw;
  const queries = [...text.matchAll(USER_QUERY_RE)].map((m) => m[1].trim()).filter(Boolean);
  if (queries.length > 0) text = queries.join("\n\n");
  const cmd = COMMAND_RE.exec(text);
  if (cmd) {
    const name = cmd[1].trim();
    const args = (cmd[2] ?? "").trim();
    text = text.replace(cmd[0], `${name.startsWith("/") ? name : "/" + name} ${args}`.trim());
  }
  for (const re of wrapperRegexes) text = text.replace(re, " ");
  // Codex desktop: "# Files pasted by the user: ... ## My request: <prompt>"
  const req = text.indexOf("## My request:");
  if (req !== -1) text = text.slice(req + "## My request:".length);
  text = text.replace(/<\/?antml:[^>]*>/g, " ");
  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.startsWith("<") && /^<[a-z_-]+[^>]*>[\s\S]*<\/[a-z_-]+>\s*$/i.test(text)) return "";
  for (const p of NOISE_PREFIXES) if (text.startsWith(p)) return "";
  return text;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

/** First meaningful line, collapsed to one line, capped. */
export function makeTitle(text: string, max = 90): string {
  const lines = text
    .split("\n")
    .map((l) =>
      l
        .replace(/^#+\s*/, "")
        .replace(/^>\s*/, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links -> label
        .replace(/https?:\/\/github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)\S*/g, "$1#$2")
        .replace(/https?:\/\/\S+/g, (u) => truncate(u.replace(/^https?:\/\//, ""), 40))
        .trim(),
    )
    .filter((l) => l.length > 0);
  const firstLine = lines.find((l) => !l.startsWith("<")) ?? lines[0] ?? "";
  return truncate(firstLine.replace(/\s+/g, " "), max);
}

export function oneLine(text: string, max = 200): string {
  return truncate(text.replace(/\s+/g, " ").trim(), max);
}
