export function buildNoteBrowserUrl(noteId: string): string {
  return `https://www.biji.com/note/${encodeURIComponent(noteId)}`;
}

export function toOpenableExternalUrl(raw?: string): string | null {
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw.trim());

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}
