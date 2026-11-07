import { Effort } from "./claude";
import { ModelId } from "./models";
import { LanguagePair } from "./prompts";

/** view: show the answer (and keep chatting) · replace: paste over the selection · copy: clipboard. */
export type OutputMode = "view" | "replace" | "copy";

export interface AiCommand {
  id: string;
  title: string;
  /** Key of Raycast's `Icon` set. */
  icon: string;
  /** Instruction for Claude. Placeholders: {selection} {clipboard} {language} {target}. */
  prompt: string;
  mode: OutputMode;
  model?: ModelId;
  effort?: Effort;
  builtin?: boolean;
  group?: string;
}

export const MODE_TITLES: Record<OutputMode, string> = {
  view: "Show",
  replace: "Replace selection",
  copy: "Copy to clipboard",
};

const READ = "Understand";
const WRITE = "Rewrite";
const DEV = "Developer";

const BUILTINS: Omit<AiCommand, "builtin">[] = [
  {
    id: "summarize",
    title: "Summarize",
    icon: "Paragraph",
    mode: "view",
    group: READ,
    prompt:
      "Summarize the text in {language}: one or two sentences with the gist, then the key points as a short bulleted list.",
  },
  {
    id: "explain",
    title: "Explain",
    icon: "LightBulb",
    mode: "view",
    group: READ,
    prompt:
      "Explain this text in {language} in plain words. Define jargon and abbreviations. If it is code, explain what it does step by step.",
  },
  {
    id: "action-items",
    title: "Extract Action Items",
    icon: "CheckList",
    mode: "view",
    group: READ,
    prompt:
      "Extract the action items from this text as a Markdown checklist (- [ ] …), with owners and due dates when they are mentioned. Write in the text's language.",
  },
  {
    id: "reply",
    title: "Draft Reply",
    icon: "Reply",
    mode: "view",
    group: READ,
    prompt:
      "This is a message the user received. Draft a reply the user could send: same language and register as the message, natural and concise. Output only the reply.",
  },
  {
    id: "shorter",
    title: "Make Shorter",
    icon: "Minus",
    mode: "replace",
    group: WRITE,
    prompt: "Make the text substantially shorter while keeping every key point. Keep the language and tone.",
  },
  {
    id: "longer",
    title: "Make Longer",
    icon: "Plus",
    mode: "replace",
    group: WRITE,
    prompt:
      "Expand the text with more detail, explanation and examples where they help. Keep the language, tone and intent.",
  },
  {
    id: "simplify",
    title: "Simplify",
    icon: "Text",
    mode: "replace",
    group: WRITE,
    prompt:
      "Rewrite the text in plain, simple language anyone can follow: short sentences and everyday words. Keep the language and meaning.",
  },
  {
    id: "bullets",
    title: "Turn into Bullet Points",
    icon: "BulletPoints",
    mode: "replace",
    group: WRITE,
    prompt: "Rewrite the text as a clean Markdown bulleted list of its points. Keep the language.",
  },
  {
    id: "email",
    title: "Turn into Email",
    icon: "Envelope",
    mode: "replace",
    group: WRITE,
    prompt:
      "Turn these notes into a clear, polite email in the same language: a subject line first (labelled in the email's language), then a greeting, the body and a closing.",
  },
  {
    id: "table",
    title: "Turn into Table",
    icon: "AppWindowGrid3x3",
    mode: "replace",
    group: WRITE,
    prompt: "Convert the text into a well-structured Markdown table. Keep the language.",
  },
  {
    id: "restore-accents",
    title: "Restore Accents",
    icon: "Keyboard",
    mode: "replace",
    group: WRITE,
    prompt:
      "This text was typed without the accents and special letters its language needs (for example Turkish written with c, g, i, o, s, u instead of ç, ğ, ı, ö, ş, ü, or French and German without accents and umlauts). Restore them where they belong. Change nothing else: not the wording, punctuation, casing or formatting.",
  },
  {
    id: "explain-error",
    title: "Explain Error",
    icon: "Bug",
    mode: "view",
    group: DEV,
    prompt:
      "This is an error message, log or stack trace. In {language}, explain what went wrong, the most likely cause and how to fix it, with concrete steps or commands.",
  },
  {
    id: "review",
    title: "Review Code",
    icon: "MagnifyingGlass",
    mode: "view",
    effort: "high",
    group: DEV,
    prompt:
      "Review this code for bugs, edge cases, security issues and unclear parts. List each issue with a short explanation and a suggested fix, most important first. Respond in {language}.",
  },
  {
    id: "commit",
    title: "Write Commit Message",
    icon: "Document",
    mode: "copy",
    group: DEV,
    prompt:
      "Write a Conventional Commits message in English for the changes described or shown (as a diff) in the text: a summary line under 72 characters, then a blank line and a short bulleted body if needed. Output only the commit message.",
  },
  {
    id: "names",
    title: "Suggest Names",
    icon: "Tag",
    mode: "view",
    group: DEV,
    prompt:
      "Suggest 5 clear English names for the variable, function or concept the text describes (camelCase, with snake_case and PascalCase variants where relevant), each with a few words of rationale in {language}.",
  },
  {
    id: "comments",
    title: "Translate Code Comments",
    icon: "Code",
    mode: "replace",
    group: DEV,
    prompt:
      "Translate only the comments and user-facing string literals in this code: into English if they are {language}, otherwise into {language}. Leave all code, identifiers and formatting exactly as they are.",
  },
  {
    id: "i18n",
    title: "Translate Localization File",
    icon: "Globe",
    mode: "replace",
    group: DEV,
    prompt:
      "This is a localization file (JSON, YAML or similar). Translate only the values: into {target} if they are {language}, otherwise into {language}. Keep keys, placeholders ({name}, {{count}}, %s), HTML tags and the file format exactly as they are.",
  },
  {
    id: "regex",
    title: "Write Regex",
    icon: "Hashtag",
    mode: "view",
    group: DEV,
    prompt:
      "Write a regular expression for what the text describes. Give the pattern in a code block, then explain it briefly in {language} with a few strings that match and a few that don't.",
  },
  {
    id: "shell",
    title: "Write Shell Command",
    icon: "Terminal",
    mode: "view",
    group: DEV,
    prompt:
      "Write a macOS zsh command (or a short script) that does what the text describes. Put it in a code block, then explain each part in one line in {language}. Warn clearly about anything destructive.",
  },
];

export const BUILTIN_COMMANDS: AiCommand[] = BUILTINS.map((command) => ({ ...command, builtin: true }));

/**
 * Fills the placeholders. When the prompt has no {selection}, the caller attaches the text
 * separately (`inline` is false).
 */
export function renderPrompt(
  command: AiCommand,
  values: {
    selection: string;
    clipboard?: string;
    langs: LanguagePair;
    tagSelection?: boolean;
    /** Put this in place of {selection} when the text is attached separately. */
    selectionPlaceholder?: string;
  },
): { prompt: string; inline: boolean } {
  const inline = command.prompt.includes("{selection}") && values.selectionPlaceholder === undefined;
  const fills: Record<string, string> = {
    selection:
      values.selectionPlaceholder ?? (values.tagSelection ? `<text>\n${values.selection}\n</text>` : values.selection),
    clipboard: values.clipboard ?? "",
    language: values.langs.primary,
    target: values.langs.secondary,
  };
  // One pass with a replacer function: inserted text is never rescanned for placeholders or "$&".
  const prompt = command.prompt.replace(/\{(selection|clipboard|language|target)\}/g, (_, key: string) => fills[key]);
  return { prompt, inline };
}
