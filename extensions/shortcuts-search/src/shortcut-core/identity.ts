// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
import type { IdentifiableShortcut } from "./types";
function parts(shortcut: IdentifiableShortcut): unknown[] {
  return [shortcut.sequence.map((atomic) => [atomic.base, atomic.modifiers]), shortcut.title, shortcut.comment ?? ""];
}
// Persisted wire format: do not change modifier spelling or array ordering.
export function getBaseShortcutId(shortcut: IdentifiableShortcut, occurrence: number): string {
  return JSON.stringify([...parts(shortcut), occurrence]);
}
export function getBaseShortcutSignature(shortcut: IdentifiableShortcut): string {
  return JSON.stringify(parts(shortcut));
}

// Old website readers split a literal plus incorrectly and mapped cmd to
// control on Windows/Linux. Keep only unambiguous compatibility aliases.
// Only expose aliases which resolve to exactly one current row in this section.
export function getSectionIdentities(shortcuts: IdentifiableShortcut[]): {
  ids: string[];
  aliases: Map<string, string[]>;
} {
  const ids = (rows: IdentifiableShortcut[]) => {
    const seen = new Map<string, number>();
    return rows.map((row) => {
      const signature = getBaseShortcutSignature(row);
      const count = seen.get(signature) ?? 0;
      seen.set(signature, count + 1);
      return getBaseShortcutId(row, count);
    });
  };
  const current = ids(shortcuts);
  const candidates = new Map<string, Set<string>>();
  const register = (alias: string, id: string) => {
    const set = candidates.get(alias) ?? new Set<string>();
    set.add(id);
    candidates.set(alias, set);
  };
  current.forEach((id) => register(id, id));
  for (const commandAsControl of [false, true])
    for (const brokenPlus of [false, true]) {
      const legacy = shortcuts.map((row) => ({
        ...row,
        sequence: row.sequence.map((chord) => ({
          base: brokenPlus && chord.base === "+" ? "" : chord.base,
          modifiers: [
            ...chord.modifiers.map((modifier) =>
              commandAsControl && modifier === "command down" ? "control down" : modifier
            ),
            ...(brokenPlus && chord.base === "+" ? [undefined as unknown as string] : []),
          ],
        })),
      }));
      ids(legacy).forEach((alias, index) => register(alias, current[index]));
    }
  // A historic Windows command ID may equal a real control ID. Give the
  // affected canonical row a distinct ID too; otherwise an exact lookup
  // would still attach an ambiguous historic record to the wrong shortcut.
  const resolved = current.map((id) => (candidates.get(id)!.size > 1 ? `v2:${id}` : id));
  const replacement = new Map(current.map((id, index) => [id, resolved[index]]));
  const result = new Map(resolved.map((id) => [id, [] as string[]]));
  candidates.forEach((targets, alias) => {
    if (targets.size === 1) {
      const id = replacement.get(Array.from(targets)[0])!;
      if (alias !== id) result.get(id)!.push(alias);
    }
  });
  current.forEach((id, index) => {
    // Keep a versioned save readable if a future catalog removes the neighbor
    // that originally made the plain ID ambiguous.
    if (resolved[index] === id) result.get(id)!.push(`v2:${id}`);
  });
  return { ids: resolved, aliases: result };
}
export function getCompatibleIds(shortcuts: IdentifiableShortcut[]): Map<string, string[]> {
  return getSectionIdentities(shortcuts).aliases;
}
