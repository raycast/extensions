import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { buildAppUrl, buildWebUrl } from "./config";
import type { Note } from "./types";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";
import { stripHtml } from "./utils/stripHtml";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    async function fetchNotes() {
      setIsLoading(true);
      try {
        const result = await remoApi.listNotes({ limit: 50 });
        const pinned = result.filter((n: Note) => n.isPinned);
        setNotes(pinned);
      } catch (error) {
        handleError(error, "Failed to fetch pinned notes");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotes();
  }, []);

  return (
    <MenuBarExtra icon={Icon.Pencil} isLoading={isLoading} tooltip="Remo Pinned Notes">
      {notes.length === 0 ? (
        <MenuBarExtra.Item title="No pinned notes" />
      ) : (
        notes.map((note) => (
          <MenuBarExtra.Item
            key={note._id}
            title={note.title || "Untitled"}
            subtitle={
              note.isLocked
                ? "Locked Note"
                : note.isE2E
                  ? "Encrypted Note"
                  : (note.summary || stripHtml(note.content || "")).substring(0, 30)
            }
            icon={note.isLocked || note.isE2E ? Icon.Lock : Icon.Document}
            onAction={() => open(buildAppUrl(`/notes/${note._id}`))}
          />
        ))
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Web App" icon={Icon.Globe} onAction={() => open(buildWebUrl())} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
