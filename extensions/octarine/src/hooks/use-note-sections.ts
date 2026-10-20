import { useMemo } from "react";
import { ALL_WORKSPACES, type IndexedNote, type WorkspaceSection } from "@type/notes";
import type { Workspace } from "@type/octarine";

type Options = {
  workspaces: Workspace[];
  selectedWorkspace: string;
  matches: (note: IndexedNote) => boolean;
  showPinnedNotesFirst?: boolean;
};

type Result = {
  dropdown: Workspace[];
  sections: WorkspaceSection[];
};

type BuildOptions = {
  workspacesByPath: ReadonlyMap<string, Workspace>;
  selectedWorkspace: string;
  matches: (note: IndexedNote) => boolean;
  showPinnedNotesFirst: boolean;
};

export function useNoteSections(
  notes: IndexedNote[],
  { workspaces, selectedWorkspace, matches, showPinnedNotesFirst = false }: Options,
): Result {
  const grouped = useMemo(() => groupByWorkspace(notes), [notes]);
  const workspacesByPath = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.path, workspace])),
    [workspaces],
  );
  const dropdown = useMemo(() => workspaceOptions(grouped, workspacesByPath), [grouped, workspacesByPath]);
  const sections = useMemo(
    () => buildSections(grouped, { workspacesByPath, selectedWorkspace, matches, showPinnedNotesFirst }),
    [grouped, selectedWorkspace, matches, showPinnedNotesFirst, workspacesByPath],
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

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
}

function workspaceOptions(sections: WorkspaceSection[], workspacesByPath: ReadonlyMap<string, Workspace>): Workspace[] {
  return sections.flatMap((section) => {
    const workspace = workspacesByPath.get(section.path);
    return workspace ? [workspace] : [];
  });
}

function buildSections(
  workspaces: WorkspaceSection[],
  { workspacesByPath, selectedWorkspace, matches, showPinnedNotesFirst }: BuildOptions,
): WorkspaceSection[] {
  return workspaces
    .filter((workspace) => selectedWorkspace === ALL_WORKSPACES || workspace.path === selectedWorkspace)
    .map((workspace) => {
      const notes = workspace.notes.filter(matches);

      return {
        name: workspacesByPath.get(workspace.path)?.display ?? workspace.name,
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
