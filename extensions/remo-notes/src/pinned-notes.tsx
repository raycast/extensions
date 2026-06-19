import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { buildAppUrl, buildWebUrl } from "./config";
import type { Note } from "./types";
import { remoApi } from "./utils/api";
import { stripHtml } from "./utils/stripHtml";
import { handleError } from "./utils/errors";

export default function Command() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const result = await remoApi.listNotes({ limit: 50 });
      return result.filter((n: Note) => n.isPinned);
    },
    [],
    { onError: (error) => handleError(error, "Failed to fetch pinned notes") },
  );

  const notes = data ?? [];

  return (
    <MenuBarExtra icon={Icon.Pin} isLoading={isLoading} tooltip="Remo Pinned Notes">
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
