import fs from "node:fs/promises";

const files = new Map<string, { users: number; discard: boolean }>();

export function retainPreview(filePath: string): () => void {
  const entry = files.get(filePath) ?? { users: 0, discard: false };
  entry.users += 1;
  files.set(filePath, entry);
  let released = false;

  return () => {
    if (released) return;
    released = true;
    entry.users -= 1;
    if (entry.users === 0 && entry.discard) {
      files.delete(filePath);
      void fs.rm(filePath, { force: true }).catch(() => undefined);
    }
  };
}

export function discardPreview(filePath: string): void {
  const entry = files.get(filePath);
  if (entry && entry.users > 0) {
    entry.discard = true;
    return;
  }
  files.delete(filePath);
  void fs.rm(filePath, { force: true }).catch(() => undefined);
}
