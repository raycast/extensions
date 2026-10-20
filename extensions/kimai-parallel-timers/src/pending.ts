const pending = new Set<string>();

// One running action of each kind per command runtime, shared by list/menu handlers.
export async function runOnce(key: string, action: () => Promise<void>) {
  if (pending.has(key)) return;
  pending.add(key);
  try {
    await action();
  } finally {
    pending.delete(key);
  }
}
