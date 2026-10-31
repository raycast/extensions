const pending = new Set<string>();

// One running action per explicit operation/record key in this command runtime.
export async function runOnce(key: string, action: () => Promise<void>) {
  if (pending.has(key)) return;
  pending.add(key);
  try {
    await action();
  } finally {
    pending.delete(key);
  }
}
