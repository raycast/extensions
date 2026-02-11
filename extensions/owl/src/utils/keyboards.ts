import { environment } from "@raycast/api";
import { readdirSync } from "node:fs";

export function loadKeyboards(): string[] {
  return (
    readdirSync(`${environment.assetsPath}/keyboards/json`, {
      withFileTypes: false,
    }) as string[]
  ).map((path) => path.replace(".json", ""));
}

export function lengthLocaleCompare(a: string, b: string): number {
  if (b.includes(a)) {
    return a.length - b.length || a.localeCompare(b);
  }

  return a.localeCompare(b);
}
