// A pattern's {{variables}}, one form field each (ISC-16). fabric refuses to
// run until every one has a value ("missing required variable"), so the form
// asks for all identifier-shaped ones. {{input}} is fabric's own slot.
//
// fabric's variable name is the raw text inside the braces, spaces included:
// `{{ name }}` and `{{name}}` are two variables (probed on 1.4.518). The form
// shows one field per trimmed name and sends its value under every spelling.

import { dict } from "./dict";

const VAR = /\{\{([ \t]*([A-Za-z_][A-Za-z0-9_-]*)[ \t]*)\}\}/g;
const BUILT_IN = new Set(["input"]);

/** Each variable's trimmed name → the raw spellings (spaces kept) the pattern uses. */
export function variableSpellings(systemMd: string | undefined): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const m of (systemMd ?? "").matchAll(VAR)) {
    if (BUILT_IN.has(m[2])) continue;
    if (!out.has(m[2])) out.set(m[2], new Set());
    out.get(m[2])!.add(m[1]);
  }
  return out;
}

export function patternVariables(systemMd: string | undefined): string[] {
  return [...variableSpellings(systemMd).keys()];
}

/** The `--variable` map fabric needs: each form value under every spelling the pattern uses. */
export function variableValues(systemMd: string | undefined, values: Record<string, string>): Record<string, string> {
  const out = dict<string>();
  for (const [name, raws] of variableSpellings(systemMd))
    for (const raw of raws) out[raw] = Object.hasOwn(values, name) ? values[name] : "";
  return out;
}
