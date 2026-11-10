import { convertLibrary } from "../src/lib/converter";
import type { MigrationSession, SourceSnippet } from "../src/lib/types";

export function createSession(
  snippets: SourceSnippet[] = [
    {
      id: "one",
      group: "Email",
      label: "Greeting",
      abbreviation: ";hi",
      text: "Hello!",
      kind: "plain",
      sourcePath: "Email.csv",
    },
    {
      id: "two",
      group: "Work",
      label: "Signature",
      abbreviation: ";sig",
      text: "Best,\nExample",
      kind: "plain",
      sourcePath: "Work.csv",
    },
  ],
  prefixGroups = true,
): MigrationSession {
  const conversion = convertLibrary({ snippets, suggestedCount: 0 }, prefixGroups);
  return {
    version: 1,
    createdAt: "2026-11-03T00:00:00.000Z",
    prefixGroups,
    sources: [],
    conversion,
    selectedIds: conversion.snippets.map((item) => item.id),
    edits: {},
    groupNames: {},
    existing: [],
  };
}
