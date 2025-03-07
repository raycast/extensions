import { Note } from "@hackmd/api/dist/type";

/**
 * Sort notes by last changed date in descending order (newest first)
 */
export const sortByLastChanged = (a: Note, b: Note) =>
  new Date(b.lastChangedAt).valueOf() - new Date(a.lastChangedAt).valueOf();
