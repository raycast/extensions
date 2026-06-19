import { type Prompt } from "../types";
import raw from "./prompts.json";

export function validate(entries: unknown): Prompt[] {
  if (!Array.isArray(entries)) {
    throw new Error("prompts.json: expected an array");
  }
  const seen = new Set<string>();
  const out: Prompt[] = [];
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("prompts.json: entry is not an object");
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.length === 0) {
      throw new Error(`prompts.json: invalid id: ${JSON.stringify(entry)}`);
    }
    if (typeof e.text !== "string" || e.text.trim().length === 0) {
      throw new Error(`prompts.json: invalid text for id ${e.id}`);
    }
    if (typeof e.context !== "string" || e.context.trim().length === 0) {
      throw new Error(`prompts.json: invalid context for id ${e.id}`);
    }
    if (
      !Array.isArray(e.examples) ||
      e.examples.length < 2 ||
      e.examples.length > 3 ||
      !e.examples.every((x) => typeof x === "string" && x.trim().length > 0)
    ) {
      throw new Error(`prompts.json: invalid examples for id ${e.id}`);
    }
    if (seen.has(e.id)) {
      throw new Error(`prompts.json: duplicate id ${e.id}`);
    }
    seen.add(e.id);
    out.push({ id: e.id, text: e.text, context: e.context, examples: e.examples as string[] });
  }
  return out;
}

export const prompts: readonly Prompt[] = validate(raw);
