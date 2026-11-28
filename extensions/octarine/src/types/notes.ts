import { isNote, type Note } from "@type/octarine";

export const ALL_WORKSPACES = "all";

export type IndexedNote = Note & {
  id: string;
  pinned: boolean;
  searchText: string;
};

export type WorkspaceSection = {
  name: string;
  path: string;
  notes: IndexedNote[];
};

export function isIndexedNote(value: unknown): value is IndexedNote {
  return (
    isNote(value) &&
    typeof (value as IndexedNote).id === "string" &&
    typeof (value as IndexedNote).pinned === "boolean" &&
    typeof (value as IndexedNote).searchText === "string"
  );
}
