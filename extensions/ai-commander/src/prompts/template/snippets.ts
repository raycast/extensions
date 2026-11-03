/**
 * Writing `{snippet}` placeholders. Raycast's syntax has no escapes, so a name is quoted with whichever quote it does
 * not contain, and a name with both kinds cannot be referenced at all.
 */

import { parseTemplate } from "./parser";

export const UNQUOTABLE_SNIPPET_NAME = "A name may contain double or single quotes, but not both.";

export function isQuotableSnippetName(name: string): boolean {
  return !(name.includes('"') && name.includes("'"));
}

export function snippetPlaceholder(name: string, modifiers: readonly string[] = []): string {
  const quote = name.includes('"') ? "'" : '"';
  return `{snippet name=${quote}${name}${quote}${modifiers.map((modifier) => ` | ${modifier}`).join("")}}`;
}

/** Points placeholders at renamed snippets. Everything else in the template stays exactly as written. */
export function renameSnippetReferences(template: string, renames: ReadonlyMap<string, string>): string {
  if (renames.size === 0) return template;
  return parseTemplate(template)
    .map((node) => {
      if (node.type !== "placeholder" || node.kind !== "snippet" || node.name === undefined) return node.raw;
      const renamed = renames.get(node.name);
      return renamed === undefined ? node.raw : snippetPlaceholder(renamed, node.modifiers);
    })
    .join("");
}
