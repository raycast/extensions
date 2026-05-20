import { TONES, type Compliment, type Tone } from "../types";
import raw from "./compliments.json";

function isTone(value: unknown): value is Tone {
  return typeof value === "string" && (TONES as readonly string[]).includes(value);
}

export function validate(entries: unknown): Compliment[] {
  if (!Array.isArray(entries)) {
    throw new Error("compliments.json: expected an array");
  }
  const seen = new Set<string>();
  const out: Compliment[] = [];
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("compliments.json: entry is not an object");
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || e.id.length === 0) {
      throw new Error(`compliments.json: invalid id: ${JSON.stringify(entry)}`);
    }
    if (typeof e.text !== "string" || e.text.trim().length === 0) {
      throw new Error(`compliments.json: invalid text for id ${e.id}`);
    }
    if (!isTone(e.tone)) {
      throw new Error(`compliments.json: invalid tone for id ${e.id}: ${String(e.tone)}`);
    }
    if (seen.has(e.id)) {
      throw new Error(`compliments.json: duplicate id ${e.id}`);
    }
    seen.add(e.id);
    out.push({ id: e.id, text: e.text, tone: e.tone });
  }
  return out;
}

export const compliments: readonly Compliment[] = validate(raw);
