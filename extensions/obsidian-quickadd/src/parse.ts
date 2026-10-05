import { Field } from "./types";

// {{VALUE}} / {{NAME}} with optional |modifiers → group 1; {{VALUE:spec}} → group 2.
const VALUE_TOKEN = /\{\{(?:(?:VALUE|NAME)(?:\|([^\n\r{}]*))?|VALUE:([^\n\r{}]*))\}\}/gi;
const OBSIDIAN_PROMPT =
  /tp\.system\.(?:prompt|suggester|multi_suggester)|\{\{(?:VDATE|FIELD|MACRO|FILE|TEMPLATE):|\{\{MVALUE\}\}/i;

interface Modifiers {
  label?: string;
  defaultValue?: string;
  name?: string;
  optional: boolean;
  custom: boolean;
  multi: boolean;
}

function parseModifiers(parts: string[]): Modifiers {
  const mods: Modifiers = { optional: false, custom: false, multi: false };
  for (const raw of parts) {
    const part = raw.trim();
    const colon = part.indexOf(":");
    const name = (colon === -1 ? part : part.slice(0, colon)).trim().toLowerCase();
    const value = colon === -1 ? "" : part.slice(colon + 1).trim();
    if (name === "label") mods.label = value || undefined;
    else if (name === "default") mods.defaultValue = value;
    else if (name === "name") mods.name = value || undefined;
    else if (name === "optional") mods.optional = true;
    else if (name === "custom") mods.custom = true;
    else if (name === "multi") mods.multi = true;
  }
  return mods;
}

function applyModifiers(field: Field, mods: Modifiers): Field {
  if (mods.label) field.label = mods.label;
  if (mods.defaultValue !== undefined) field.defaultValue = mods.defaultValue;
  if (mods.optional) field.optional = true;
  return field;
}

const plain = (): Field => ({ key: "value", rawKey: "value", label: "Value", optional: false });

function tokenField(spec: string): { field: Field; obsidianOnly: boolean } {
  const [first = "", ...rest] = spec.split("|");
  const mods = parseModifiers(rest);
  const key = first.trim();
  if (key === "") return { field: applyModifiers(plain(), mods), obsidianOnly: false };

  const field: Field = { key, rawKey: first, label: key, optional: false };
  if (key.includes(",")) {
    field.options = key
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
  }
  if (mods.name) {
    field.key = mods.name;
    field.rawKey = mods.name;
    field.label = mods.name;
  }
  return { field: applyModifiers(field, mods), obsidianOnly: Boolean(field.options) && (mods.custom || mods.multi) };
}

/** Field for `{{VALUE:<spec>}}`. */
export function parseToken(spec: string | undefined): Field {
  return tokenField(spec ?? "").field;
}

export function parseFields(texts: string[]): { fields: Field[]; hasObsidianPrompts: boolean } {
  const byKey = new Map<string, Field>();
  let hasObsidianPrompts = texts.some((text) => OBSIDIAN_PROMPT.test(text));
  for (const text of texts) {
    for (const match of text.matchAll(VALUE_TOKEN)) {
      const { field, obsidianOnly } =
        match[2] !== undefined
          ? tokenField(match[2])
          : {
              field: applyModifiers(plain(), parseModifiers(match[1] ? match[1].split("|") : [])),
              obsidianOnly: false,
            };
      if (obsidianOnly) {
        hasObsidianPrompts = true;
        continue;
      }
      const id = field.key.toLowerCase();
      if (!byKey.has(id)) byKey.set(id, field);
    }
  }
  return { fields: [...byKey.values()], hasObsidianPrompts };
}

/** A single plain `{{VALUE}}` with its default label — shown as one text area. */
export function isLoneValue(fields: Field[]): boolean {
  return fields.length === 1 && fields[0].key === "value" && fields[0].label === "Value" && !fields[0].options;
}
