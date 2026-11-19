import { createHash } from "node:crypto";

export type Dict = Record<string, unknown>;
export function object(value: unknown): Dict | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Dict) : undefined;
}
export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
export const unique = (values: string[]) => [...new Set(values)].sort();
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const setKeys = new Set([
  "permissions",
  "optional_permissions",
  "host_permissions",
  "optional_host_permissions",
  "matches",
  "exclude_matches",
  "include_globs",
  "exclude_globs",
  "api",
  "explicit_host",
  "scriptable_host",
  "disable_reasons",
]);
// Object ordering and permission/match ordering are immaterial. Script order is not.
export function canonical(value: unknown, key = ""): string {
  if (Array.isArray(value)) {
    const items = value.map((v) => canonical(v));
    return `[${(setKeys.has(key) ? [...new Set(items)].sort() : items).join(",")}]`;
  }
  const dict = object(value);
  if (dict)
    return `{${Object.keys(dict)
      .filter((k) => dict[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(dict[k], k)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
