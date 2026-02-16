import TOML from "@iarna/toml";
import { createHash } from "crypto";

export interface PetSnippet {
  id: string;
  description: string;
  command: string;
  output: string;
  tags: string[];
  searchBlob: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function buildSnippetId(
  description: string,
  command: string,
  tags: string[],
): string {
  const hash = createHash("sha1");
  hash.update(`${description}\n${command}\n${tags.join(",")}`);
  return hash.digest("hex");
}

function titleFromCommand(command: string): string {
  const firstLine = command.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 80) || "Untitled snippet";
}

export function parsePetSnippets(tomlContent: string): PetSnippet[] {
  const parsed = TOML.parse(tomlContent);
  const root = asRecord(parsed);
  if (!root) {
    throw new Error("Invalid pet snippet file: expected top-level table.");
  }

  const rawSnippets = root.Snippets ?? root.snippets;
  if (!Array.isArray(rawSnippets)) {
    throw new Error("Invalid pet snippet file: expected [[Snippets]] entries.");
  }

  const snippets: PetSnippet[] = [];
  for (const rawEntry of rawSnippets) {
    const entry = asRecord(rawEntry);
    if (!entry) {
      continue;
    }

    const command = firstString(entry, ["command", "Command"]);
    const description =
      firstString(entry, ["Description", "description"]) ??
      (command ? titleFromCommand(command) : "");
    if (!description || !command) {
      continue;
    }

    const output = firstString(entry, ["Output", "output"]) ?? "";
    const tags = asStringArray(entry.Tag ?? entry.tag);
    const id = buildSnippetId(description, command, tags);
    const searchBlob =
      `${description} ${command} ${tags.join(" ")}`.toLowerCase();

    snippets.push({
      id,
      description,
      command,
      output,
      tags,
      searchBlob,
    });
  }

  return snippets;
}
