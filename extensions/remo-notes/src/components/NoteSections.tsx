import { List } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import { NoteListItem } from "./NoteListItem";
import type { Folder, Note } from "../types";

interface NoteSectionsProps {
  notes: Note[];
  onRefresh: () => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  mutate?: MutatePromise<Note[]> | MutatePromise<Note[] | undefined>;
  folders?: Folder[];
  othersTitle?: string;
  othersSubtitle?: string;
  groupPinned?: boolean;
}

export function NoteSections({
  notes,
  othersTitle = "Notes",
  othersSubtitle,
  groupPinned = true,
  ...itemProps
}: NoteSectionsProps) {
  const renderItem = (note: Note) => <NoteListItem key={note._id} note={note} {...itemProps} />;

  if (!groupPinned) {
    return <>{notes.map(renderItem)}</>;
  }

  const pinned = notes.filter((note) => note.isPinned);
  const others = notes.filter((note) => !note.isPinned);

  return (
    <>
      {pinned.length > 0 && (
        <List.Section title="Pinned" subtitle={`${pinned.length}`}>
          {pinned.map(renderItem)}
        </List.Section>
      )}
      {others.length > 0 && (
        <List.Section title={othersTitle} subtitle={othersSubtitle ?? `${others.length}`}>
          {others.map(renderItem)}
        </List.Section>
      )}
    </>
  );
}
