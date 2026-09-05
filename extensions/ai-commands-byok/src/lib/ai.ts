import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Clipboard, getPreferenceValues } from "@raycast/api";
import { DEFAULT_MODELS, type AICommand, type ExtensionPrefs } from "./types";

export function resolveModel(cmd: Pick<AICommand, "provider" | "model">): string {
  const prefs = getPreferenceValues<ExtensionPrefs>();
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
  const prefs = getPreferenceValues<ExtensionPrefs>();
  const model = resolveModel(cmd);
  const prompt = await expandPlaceholders(cmd.prompt);
  const templated = prompt.includes("{selection}");
  const system = templated ? undefined : prompt;
  const user = templated ? prompt.split("{selection}").join(text) : `<text>\n${text}\n</text>`;

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

/**
 * Raycast prompt placeholders we honour besides {selection}:
 * {clipboard} → current clipboard text, {argument name=x default="y"} → y.
 */
async function expandPlaceholders(prompt: string): Promise<string> {
  let out = prompt.replace(/\{argument[^}]*?default="([^"]*)"[^}]*\}/g, "$1").replace(/\{argument[^}]*\}/g, "");
  if (out.includes("{clipboard}")) out = out.split("{clipboard}").join((await Clipboard.readText()) ?? "");
  return out;
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
