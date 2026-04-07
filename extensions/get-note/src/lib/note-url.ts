export function buildNoteBrowserUrl(noteId: string): string {
  return `https://www.biji.com/note/${encodeURIComponent(noteId)}`;
}
