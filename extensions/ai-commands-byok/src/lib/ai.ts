import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Clipboard, getPreferenceValues } from "@raycast/api";
import { DEFAULT_MODELS, type AICommand } from "./types";

export function resolveModel(cmd: Pick<AICommand, "provider" | "model">): string {
  const prefs = getPreferenceValues<Preferences>();
  const fromPrefs = cmd.provider === "openai" ? prefs.openaiModel : prefs.anthropicModel;
  return cmd.model?.trim() || fromPrefs?.trim() || DEFAULT_MODELS[cmd.provider];
}

/**
 * Streams the model's reply as text chunks.
 *
 * A prompt containing `{selection}` becomes the whole user message with the
 * text substituted in, exactly like Raycast's own AI Commands. A prompt
 * without it is sent as the system prompt and the text follows in <text>
 * tags, so instructions hidden inside the selection are treated as content.
 */
export async function* runCommand(cmd: AICommand, text: string): AsyncGenerator<string> {
  const prefs = getPreferenceValues<Preferences>();
  const model = resolveModel(cmd);
  // Decide the shape from the template, never from substituted content: a
  // clipboard that happens to contain "{selection}" must not change the mode.
  const templated = /\{selection\}/.test(cmd.prompt);
  const prompt = await expandPlaceholders(cmd.prompt, text);
  const system = templated ? undefined : prompt;
  const user = templated ? prompt : `<text>\n${text}\n</text>`;

  if (cmd.provider === "anthropic") {
    if (!prefs.anthropicApiKey) throw new Error("Add your Anthropic API key in the extension preferences (⌘ ,).");
    const client = new Anthropic({ apiKey: prefs.anthropicApiKey });
    const stream = client.messages.stream({
      model,
      max_tokens: 16000,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: user }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") throw new Error("Claude declined this request.");
    return;
  }

  if (!prefs.openaiApiKey) throw new Error("Add your OpenAI API key in the extension preferences (⌘ ,).");
  const client = new OpenAI({ apiKey: prefs.openaiApiKey });
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: user },
    ],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

const PLACEHOLDER = /\{(selection|clipboard|argument\b[^}]*)\}/g;

/**
 * Replaces the placeholders we support in ONE pass, so text that comes in
 * through one placeholder is never re-scanned for another:
 * {selection} → the selected text, {clipboard} → clipboard text,
 * {argument name=x default="y"} → y.
 */
async function expandPlaceholders(prompt: string, selection: string): Promise<string> {
  const clipboard = /\{clipboard\}/.test(prompt) ? ((await Clipboard.readText()) ?? "") : "";
  return prompt.replace(PLACEHOLDER, (_, inner: string) => {
    if (inner === "selection") return selection;
    if (inner === "clipboard") return clipboard;
    return /default="([^"]*)"/.exec(inner)?.[1] ?? "";
  });
}

/**
 * Raycast placeholders and mentions this extension cannot run. Used to refuse
 * imports that would silently lose behaviour: {browser-tab}, {argument …}
 * without a default, and @extension{…} tool mentions.
 */
export function unsupportedPlaceholders(prompt: string): string[] {
  const found = new Set<string>();
  // Mentions carry their own braces ({id=…}); take them out before scanning.
  const mentions = prompt.matchAll(/@[\w-]+\{[^}]*\}/g);
  for (const m of mentions) found.add(m[0].split("{")[0]);
  const rest = prompt.replace(/@[\w-]+\{[^}]*\}/g, "");
  for (const m of rest.matchAll(/\{([a-z-]+)(\b[^}]*)\}/gi)) {
    const name = m[1].toLowerCase();
    if (name === "selection" || name === "clipboard") continue;
    if (name === "argument" && /default="/.test(m[2])) continue;
    found.add(`{${name}}`);
  }
  return [...found];
}

/**
 * Cleans model habits that would end up pasted into the user's document:
 * an echoed "Improved text:" trailer, and quotes wrapped around the whole reply.
 */
export function tidy(output: string, original: string): string {
  let out = output.replace(/\n*\s*(Improved|Rewritten|Revised|Corrected) text:?\s*$/i, "").trim();
  const wrapped = /^(["'“”‘’`])([\s\S]*)(["'“”‘’`])$/.exec(out);
  const originalWrapped = /^["'“”‘’`][\s\S]*["'“”‘’`]$/.test(original.trim());
  if (wrapped && !originalWrapped) out = wrapped[2].trim();
  return out;
}
