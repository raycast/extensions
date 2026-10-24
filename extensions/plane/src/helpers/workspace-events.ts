type Listener = (workspaceSlug: string) => void;

const listeners = new Set<Listener>();

/** Subscribe to workspace changes. Returns an unsubscribe function. */
export function onWorkspaceChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitWorkspaceChange(workspaceSlug: string) {
  for (const listener of listeners) {
    listener(workspaceSlug);
  }
}
