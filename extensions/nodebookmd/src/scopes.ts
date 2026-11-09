// Same shorthands as the app (`src/lib/scope.ts` in NodebookMD): `v:point` keeps the search to VEX functions.
export type Scope = { keys: string[]; paths: string[]; history?: boolean };

const SCOPES: Scope[] = [
  // The pages opened from Raycast, in place of a part of the docs.
  { keys: ["h", "history"], paths: [], history: true },
  { keys: ["v", "vex"], paths: ["vex/functions/"] },
  { keys: ["vop"], paths: ["nodes/vop/"] },
  { keys: ["sop"], paths: ["nodes/sop/"] },
  { keys: ["lop"], paths: ["nodes/lop/"] },
  { keys: ["dop"], paths: ["nodes/dop/"] },
  { keys: ["cop"], paths: ["nodes/cop/"] },
  { keys: ["obj"], paths: ["nodes/obj/"] },
  { keys: ["rop", "out"], paths: ["nodes/out/"] },
  { keys: ["chop"], paths: ["nodes/chop/"] },
  { keys: ["top"], paths: ["nodes/top/"] },
  { keys: ["apex"], paths: ["nodes/apex/"] },
  { keys: ["e", "exp", "expr"], paths: ["expressions/"] },
  { keys: ["py", "hom"], paths: ["hom/"] },
  { keys: ["hs", "hscript"], paths: ["commands/"] },
  { keys: ["ex", "example"], paths: ["examples/"] },
];

const SHORTHAND = /^([a-z]+):\s*/i;

/** The scope a query starts with, and the words after it. */
export function parseScope(query: string): { scope: Scope | undefined; words: string } {
  const found = SHORTHAND.exec(query);
  const key = found?.[1].toLowerCase();
  const scope = key ? SCOPES.find((entry) => entry.keys.includes(key)) : undefined;
  if (!found || !scope) return { scope: undefined, words: query };
  return { scope, words: query.slice(found[0].length) };
}

export function inScope(scope: Scope | undefined, path: string): boolean {
  return !scope || scope.paths.some((prefix) => path.startsWith(prefix));
}
