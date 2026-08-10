import { Icon, List } from "@raycast/api";
import type { NoteEntity } from "crossbell";
import { useCharacter } from "../apis";
import { extractCharacterInfo } from "../utils/character";
import { extractNoteInfo } from "../utils/note";
import NoteActionPanel from "./NoteActionPanel";

export default function NoteListItem({ note }: { note: NoteEntity }) {
  const { title, content, createdAt } = extractNoteInfo(note);

  const { data: character } = useCharacter(note?.characterId);

  const { avatar, username, handle } = extractCharacterInfo(character);

  const replied = note.toNoteId ? "Replied: " : "";

  return (
    <List.Item
      icon={avatar ? { source: avatar } : Icon.Person}
      title={replied + (title ? title : content)}
      subtitle={title ? content : undefined}
      accessories={[{ icon: Icon.Person, text: username ?? handle, tooltip: handle }, { date: new Date(createdAt) }]}
      actions={<NoteActionPanel note={note} enableShowDetail={true} />}
    />
  );
}
