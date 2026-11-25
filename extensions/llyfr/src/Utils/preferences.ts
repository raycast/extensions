/**
 * Raycast's file picker can't restrict the file type, so the selected
 * bibliography file has to be checked before it is read or appended to.
 */
export const isBibFile = (file: string): boolean => file.toLowerCase().endsWith(".bib");
