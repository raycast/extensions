import { useMemo } from "react";
import { ALL_WORKSPACES, type IndexedNote, type WorkspaceSection } from "@type/notes";

type Options = {
  selectedWorkspace: string;
  matches: (note: IndexedNote) => boolean;
  showPinnedNotesFirst?: boolean;
};

type Result = {
  dropdown: string[];
  sections: WorkspaceSection[];
};

type BuildOptions = Required<Options>;

export function useNoteSections(
  notes: IndexedNote[],
  { selectedWorkspace, matches, showPinnedNotesFirst = false }: Options,
): Result {
  const grouped = useMemo(() => groupByWorkspace(notes), [notes]);
  const dropdown = useMemo(() => workspaceNames(grouped), [grouped]);
  const sections = useMemo(
    () => buildSections(grouped, { selectedWorkspace, matches, showPinnedNotesFirst }),
    [grouped, selectedWorkspace, matches, showPinnedNotesFirst],
  );

  return { dropdown, sections };
}

function groupByWorkspace(notes: IndexedNote[]): WorkspaceSection[] {
  const grouped = new Map<string, WorkspaceSection>();

  for (const note of notes) {
    const section = grouped.get(note.folder.workspace.path);

    if (section) {
      section.notes.push(note);
    } else {
      grouped.set(note.folder.workspace.path, {
        name: note.folder.workspace.name,
        path: note.folder.workspace.path,
        notes: [note],
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function workspaceNames(workspaces: WorkspaceSection[]): string[] {
  return Array.from(new Set(workspaces.map((workspace) => workspace.name)));
}

function buildSections(
  workspaces: WorkspaceSection[],
  { selectedWorkspace, matches, showPinnedNotesFirst }: BuildOptions,
): WorkspaceSection[] {
  return workspaces
    .filter((workspace) => selectedWorkspace === ALL_WORKSPACES || workspace.name === selectedWorkspace)
    .map((workspace) => {
      const notes = workspace.notes.filter(matches);

      return {
        name: workspace.name,
        path: workspace.path,
        notes: showPinnedNotesFirst ? sortPinnedFirst(notes) : notes,
      };
    })
    .filter((workspace) => workspace.notes.length > 0);
}

function sortPinnedFirst(notes: IndexedNote[]): IndexedNote[] {
  if (notes.length < 2) {
    return notes;
  }

  const pinned: IndexedNote[] = [];
  const unpinned: IndexedNote[] = [];

  for (const note of notes) {
    if (note.pinned) {
      pinned.push(note);
    } else {
      unpinned.push(note);
    }
  }

  if (pinned.length === 0 || unpinned.length === 0) {
    return notes;
  }

  return [...pinned, ...unpinned];
}
