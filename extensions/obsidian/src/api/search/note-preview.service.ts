export const MAX_INLINE_NOTE_CONTENT_SIZE_BYTES = 64 * 1024;

export function shouldLoadNoteContentForList(isSelected: boolean, hasMatch: boolean, fileSize: number): boolean {
  return isSelected && !hasMatch && fileSize <= MAX_INLINE_NOTE_CONTENT_SIZE_BYTES;
}
