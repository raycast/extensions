/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { logError } from "@/utils/logger";

import type {
  AIDictionaryEntry,
  AIDictionaryExample,
  AIDictionaryForm,
  AIDictionarySense,
  AIWordResult,
} from "./types";

export function parseAIWordResult(value: unknown): AIWordResult {
  try {
    const parsed = typeof value === "string" ? parseJSON(value) : value;
    const result = requireObject(parsed, "result");

    return {
      translation: requireString(read(result, "translation"), "translation"),
      entry: parseEntry(read(result, "entry")),
    };
  } catch (error) {
    logError("AI Dictionary", `response sample: ${formatResponseSample(value)}`, error);
    throw error;
  }
}

function parseJSON(raw: string): unknown {
  const text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const json = fenced?.[1] ?? text;

  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error("AI dictionary response is not valid JSON");
  }
}

function parseEntry(value: unknown): AIDictionaryEntry | null {
  if (value === null) return null;

  const entry = requireObject(value, "entry");
  const senses = parseArray(read(entry, "senses"), "entry.senses", parseSense);
  if (senses.length === 0) {
    throw new Error('AI dictionary response field "entry.senses" must contain at least one sense');
  }
  return {
    headword: requireString(read(entry, "headword"), "entry.headword"),
    pronunciation: optionalString(read(entry, "pronunciation")),
    senses,
    forms: parseOptionalArray(read(entry, "forms"), "entry.forms", parseForm),
  };
}

function parseSense(value: unknown, path: string): AIDictionarySense {
  const sense = requireObject(value, path);
  return {
    partOfSpeech: optionalString(read(sense, "partOfSpeech")),
    meanings: parseNonEmptyStringArray(read(sense, "meanings"), `${path}.meanings`),
    definition: optionalString(read(sense, "definition")),
    examples: parseOptionalArray(read(sense, "examples"), `${path}.examples`, parseExample),
  };
}

function parseExample(value: unknown, path: string): AIDictionaryExample {
  const example = requireObject(value, path);
  return {
    sentence: requireString(read(example, "sentence"), `${path}.sentence`),
    translation: optionalString(read(example, "translation")),
  };
}

function parseForm(value: unknown, path: string): AIDictionaryForm {
  const form = requireObject(value, path);
  return {
    label: requireString(read(form, "label"), `${path}.label`),
    value: requireString(read(form, "value"), `${path}.value`),
  };
}

function parseArray<T>(value: unknown, path: string, parseItem: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`AI dictionary response field "${path}" must be an array`);
  }
  return value.map((item, index) => parseItem(item, `${path}[${index}]`));
}

function parseOptionalArray<T>(value: unknown, path: string, parseItem: (item: unknown, path: string) => T): T[] {
  return value === undefined || value === null ? [] : parseArray(value, path, parseItem);
}

function parseNonEmptyStringArray(value: unknown, path: string): string[] {
  const strings = parseArray(value, path, requireString);
  if (strings.length === 0) {
    throw new Error(`AI dictionary response field "${path}" must contain at least one meaning`);
  }
  return strings;
}

function requireObject(value: unknown, path: string): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`AI dictionary response field "${path}" must be an object`);
  }
  return value;
}

function read(value: object, key: string): unknown {
  return Reflect.get(value, key);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`AI dictionary response field "${path}" must be a non-empty string`);
  }
  return value.trim();
}

// Optional fields degrade to `undefined` when absent, empty, or the wrong type,
// so a stray non-string on an optional field never fails the whole entry.
function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function formatResponseSample(value: unknown): string {
  if (typeof value === "string") return value.replace(/\s+/gu, " ").trim();
  return JSON.stringify(value) ?? String(value);
}
