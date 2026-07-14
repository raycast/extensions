import { Tool } from "@raycast/api";
import { applyQuickAdd } from "../lib/quickadd";
import { ENTRY_TYPES, type EntryType } from "../lib/routing";

type Input = {
  /**
   * Domains, keywords, or geosite/geoip identifiers to add to xkeen routing.
   */
  values: string[];

  /**
   * The type of entries being added. Defaults to "domain". Use "geoip" when
   * targeting an IP-based/country category (a category whose rule matches on
   * `ip`, not `domain`) — "domain", "keyword" and "geosite" only apply to
   * domain-based categories.
   */
  entryType?: "domain" | "keyword" | "geosite" | "geoip";

  /**
   * The routing category number to add entries to. If omitted, the default
   * "Manual Domains (Raycast)" category is used, and auto-created if it
   * doesn't exist yet.
   */
  categoryNumber?: number;
};

function resolveEntryType(raw: Input["entryType"]): EntryType {
  const entryType = raw ?? "domain";
  if (!(entryType in ENTRY_TYPES)) {
    throw new Error(`Invalid entryType "${entryType}". Expected one of: ${Object.keys(ENTRY_TYPES).join(", ")}`);
  }
  return entryType;
}

function describeTarget(categoryNumber: number | undefined): string {
  return categoryNumber !== undefined ? `category ${categoryNumber}` : `"Manual Domains (Raycast)"`;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const entryType = resolveEntryType(input.entryType);
  const target = describeTarget(input.categoryNumber);
  const count = input.values.length;

  return {
    message: `Add ${count} ${entryType} ${count === 1 ? "entry" : "entries"} to ${target}?`,
    info: [
      { name: "Values", value: input.values.join(", ") },
      { name: "Type", value: entryType },
      { name: "Category", value: target },
    ],
  };
};

export default async function tool(input: Input) {
  const entryType = resolveEntryType(input.entryType);
  return applyQuickAdd({
    rawInput: input.values.join("\n"),
    entryType,
    categoryNumber: input.categoryNumber,
  });
}
