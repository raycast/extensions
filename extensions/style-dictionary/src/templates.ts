import type { Token } from "./tokens";

export type Template = { scope: string[]; pattern: string };

export function parseTemplates(text = ""): Template[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^@(\S+)\s+(.+)$/);
      return m ? { scope: m[1].split("."), pattern: m[2] } : { scope: [], pattern: line };
    });
}

export function renderTemplates(templates: Template[], token: Pick<Token, "path" | "value">): string[] {
  return templates
    .filter((t) => token.path.length > t.scope.length && t.scope.every((s, i) => token.path[i] === s))
    .sort((a, b) => b.scope.length - a.scope.length)
    .map((t) => {
      const name = token.path.slice(t.scope.length);
      const words = name
        .flatMap((p) => p.split(/[\s_-]+|(?<=[a-z0-9])(?=[A-Z])/))
        .filter(Boolean)
        .map((w) => w.toLowerCase());
      const values: Record<string, string> = {
        name: name.join("."),
        path: token.path.join("."),
        "kebab-name": words.join("-"),
        "snake-name": words.join("_"),
        "camel-name": words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join(""),
        value: token.value,
      };
      return t.pattern.replace(/\{([a-z-]+)\}/g, (m, key: string) => values[key] ?? m);
    });
}
