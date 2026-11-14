import { spaceInfos } from "./data";

/** A space the user typed, by name or the start of one, any case. */
export function spaceNamed(name?: string): string | undefined {
  const typed = name?.trim().toLowerCase();
  if (!typed) return undefined;
  const all = spaceInfos();
  const hit =
    all.find((s) => s.name.toLowerCase() === typed) ??
    all.find((s) => s.name.toLowerCase().startsWith(typed)) ??
    all.find((s) => s.name.toLowerCase().includes(typed));
  if (!hit) throw new Error(`No space called “${name}”`);
  return hit.id;
}
