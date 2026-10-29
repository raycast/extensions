import { colorFormats } from "./color.ts";
import type { Token } from "./tokens";

export function tokenMatcher(search: string) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const queryHex = colorFormats(search.trim())?.hex;
  return (t: Pick<Token, "path" | "value" | "alias" | "kind">) => {
    const formats = t.kind === "color" ? colorFormats(t.value) : undefined;
    if (queryHex && formats?.hex === queryHex) return true;
    const haystack = [t.path.join("."), t.value, t.alias ?? "", ...Object.values(formats ?? {})]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  };
}
