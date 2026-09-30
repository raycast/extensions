export function composeCharacterUrl(handle: string) {
  return `https://crossbell.io/@${handle}`;
}

export function composeNoteUrl(characterId: number, noteId: number) {
  return `https://crossbell.io/notes/${characterId}-${noteId}`;
}
