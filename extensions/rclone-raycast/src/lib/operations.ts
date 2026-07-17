import type { components } from "rclone-openapi";

export type OptionsInfoOption = components["schemas"]["OptionsInfoOption"];

export function sortByName(a: OptionsInfoOption, b: OptionsInfoOption) {
  return (a.Name ?? "").localeCompare(b.Name ?? "");
}

export function normalizeGroups(groups?: string) {
  return (
    groups
      ?.split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

export function flagHasGroup(flag: OptionsInfoOption | undefined, group: string) {
  return normalizeGroups(flag?.Groups).some((entry) => entry === group);
}

export function buildFlagInfo(flag: OptionsInfoOption | undefined) {
  if (!flag) {
    return undefined;
  }
  const lines: string[] = [];
  if (flag.Help) {
    lines.push(flag.Help.trim());
  }
  if (flag.Examples?.length) {
    flag.Examples.forEach((example) => {
      const parts = [`Example: ${example.Value}`];
      if (example.Help) {
        parts.push(example.Help);
      }
      lines.push(parts.join(" — "));
    });
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}

export function serializeOptionValue(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
