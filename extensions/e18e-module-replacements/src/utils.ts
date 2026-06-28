import { type KnownUrl } from "module-replacements";

import { ALL_MODULES } from "./constants";

export function urlLabel(url: KnownUrl): string {
  if (typeof url === "string") return url;
  switch (url.type) {
    case "mdn":
      return "MDN";
    case "node":
      return "Node.js docs";
    case "e18e":
      return "e18e docs";
  }
}

export function npmxUrl(id: string) {
  return `https://www.npmx.dev/package/${id}`;
}

export function resolveDocUrl(url: KnownUrl) {
  if (typeof url === "string") return url;
  switch (url.type) {
    case "mdn":
      return `https://developer.mozilla.org/en-US/docs/${url.id}`;
    case "node":
      return `https://nodejs.org/${url.id}`;
    case "e18e":
      return `https://e18e.dev/docs/replacements/${url.id}`;
  }
}

export function toMarkdown(module: (typeof ALL_MODULES)[number]) {
  const lines: string[] = [];

  lines.push(`# ${module.moduleName}`);
  lines.push(`Number of replacements: ${module.replacements.length}`);

  for (const replacement of module.replacements) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`## ${replacement.id}`);

    switch (replacement.type) {
      case "native":
        lines.push(`This feature is available natively by using \`${replacement.id}\`. No third-party package needed.`);

        if (replacement.description) {
          lines.push(replacement.description);
        }
        break;

      case "documented":
        lines.push("This package provides equivalent functionality and has been flagged as more performant.");
        break;

      case "removal":
        lines.push(`This package is no longer necessary. ${replacement.description ?? ""}`.trim());
        break;

      case "simple":
        lines.push(`This package can be replaced with a simple snippet. ${replacement.description ?? ""}`.trim());
        if (replacement.example) {
          lines.push("```js");
          lines.push(replacement.example);
          lines.push("```");
        }
        break;
    }
  }

  return lines.join("\n");
}
