/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { QueryWordInfo } from "./types";

export function decodeQueryWordInfo(value: unknown, path = "queryWordInfo"): QueryWordInfo {
  const source = record(value, path);
  return {
    word: text(source.word, `${path}.word`),
    fromLanguage: text(source.fromLanguage, `${path}.fromLanguage`),
    toLanguage: text(source.toLanguage, `${path}.toLanguage`),
    isWord: optional(source.isWord, boolean, `${path}.isWord`),
    phonetic: optional(source.phonetic, text, `${path}.phonetic`),
    examTypes: optional(source.examTypes, strings, `${path}.examTypes`),
    speechUrl: optional(source.speechUrl, text, `${path}.speechUrl`),
  };
}

export function invalid(path: string): Error {
  return new Error(`Invalid saved result field: ${path}`);
}

export function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid(path);
  return value as Record<string, unknown>;
}

export function text(value: unknown, path: string): string {
  if (typeof value !== "string") throw invalid(path);
  return value;
}

export function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw invalid(path);
  return value;
}

export function strings(value: unknown, path: string): string[] {
  return array(value, text, path);
}

export function member<T extends string>(value: unknown, values: readonly T[], path: string): T {
  const found = values.find((candidate) => candidate === value);
  if (found === undefined) throw invalid(path);
  return found;
}

export function optional<T>(value: unknown, decode: (value: unknown, path: string) => T, path: string): T | undefined {
  return value === undefined ? undefined : decode(value, path);
}

export function array<T>(value: unknown, decode: (value: unknown, path: string) => T, path: string): T[] {
  if (!Array.isArray(value)) throw invalid(path);
  return Array.from(value, (entry, index) => decode(entry, `${path}[${index}]`));
}
