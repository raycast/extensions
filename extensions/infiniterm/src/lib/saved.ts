// Pure logic for the saved commands, import-free so node --test can run it.

export type SavedCommand = {
  id: string;
  name: string;
  command: string;
  // Press Enter after the text, so the command runs instead of only being typed.
  enter: boolean;
};

// A damaged or hand-edited file must never break the command: bad entries are dropped, not thrown on.
export function parseSaved(json: string): SavedCommand[] {
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.flatMap((d): SavedCommand[] => {
      if (!d || typeof d !== "object") return [];
      const { id, name, command, enter } = d as Record<string, unknown>;
      if (typeof id !== "string" || typeof name !== "string" || typeof command !== "string") return [];
      return [{ id, name, command, enter: enter !== false }];
    });
  } catch {
    return [];
  }
}

// Replaces the entry with the same id, or appends a new one.
export function upsert(list: SavedCommand[], item: SavedCommand): SavedCommand[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const next = [...list];
  next[i] = item;
  return next;
}

export function remove(list: SavedCommand[], id: string): SavedCommand[] {
  return list.filter((x) => x.id !== id);
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
