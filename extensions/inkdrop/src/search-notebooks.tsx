import { Action, ActionPanel, List } from "@raycast/api";
import { useNotebooks, useNotes } from "./hooks";

export default function Command() {
  const { notebooks } = useNotebooks();
  const { notes } = useNotes();
  return (
    <List>
      {notebooks &&
        notebooks?.map((notebook) => {
          const notesInNotebook = notes?.filter((note) => note.bookId === notebook._id);
          const notesCount = notesInNotebook?.length;
          const subtitle = notesCount ? `${notesCount} notes` : `No notes`;

          return (
            <List.Item
              key={notebook._id}
              title={notebook.name}
              subtitle={subtitle}
              actions={
                notesInNotebook &&
                notesInNotebook.length > 0 && (
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Inkdrop" url={`inkdrop://${notesInNotebook[0]._id}`} />
                  </ActionPanel>
                )
              }
            />
          );
        })}
    </List>
  );
}
