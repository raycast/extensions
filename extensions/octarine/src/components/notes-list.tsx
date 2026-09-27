import { List } from "@raycast/api";
import type { ReactNode } from "react";
import type { IndexedNote, WorkspaceSection } from "@type/notes";

type Props = {
  sections: WorkspaceSection[];
  grouped?: boolean;
  counter?: boolean;
  renderNote: (note: IndexedNote) => ReactNode;
  renderSectionStart?: (section: WorkspaceSection) => ReactNode;
};

export function NotesList({ sections, grouped = false, counter = false, renderNote, renderSectionStart }: Props) {
  if (grouped) {
    return sections.map((section) => (
      <List.Section key={section.path} title={counter ? `${section.name} (${section.notes.length})` : section.name}>
        {renderSectionStart?.(section)}
        {section.notes.map((note) => renderNote(note))}
      </List.Section>
    ));
  }

  return sections.flatMap((section) => section.notes.map((note) => renderNote(note)));
}
