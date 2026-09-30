import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { listNotes } from "./api/endpoints";
import { DEFAULT_PAGE_SIZE as PAGE_SIZE, satisfied } from "./api/operations";
import type { Note } from "./api/types";
import { guard } from "./components/Guard";
import NoteEditForm from "./components/NoteEditForm";
import { useAttio } from "./hooks/useAttio";
import { useMembers } from "./hooks/useMembers";
import { useRecordTitles } from "./hooks/useRecordTitles";
import { noteListTitle } from "./lib/note-display";
import OpenInAttio from "./open-in-attio";

export default function Notes() {
  const h = useAttio(
    "listNotes",
    () =>
      async ({ page }: { page: number }) => {
        const { data } = await listNotes({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        return { data, hasMore: data.length === PAGE_SIZE };
      },
    [],
  );
  const { isLoading, data, pagination, revalidate, self } = h;
  const { nameFor, avatarFor } = useMembers();
  // API ignores sort params on this endpoint (verified live 2026-09-01), so notes
  // arrive in whatever order pages stream in — sort client-side, and re-sort as
  // more pages load since order can shift.
  const notes: Note[] = [...(data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail-notes", true);
  const { titleFor } = useRecordTitles(
    notes.map((n) => ({ target_object: n.parent_object, target_record_id: n.parent_record_id })),
  );

  const g = guard(h.guardInput(notes.length > 0));
  if (g) return g;

  return (
    <List isLoading={isLoading} pagination={pagination} isShowingDetail={notes.length > 0 && showDetail}>
      {!isLoading && notes.length === 0 ? (
        <List.EmptyView
          icon={{ source: { dark: "empty/note@dark.svg", light: "empty/note.svg" } }}
          title="Notes"
          description="No notes yet!"
        />
      ) : (
        notes.map((note) => {
          const parent = titleFor(note.parent_record_id);
          const actorId = note.created_by_actor?.id;
          const accessories: List.Item.Accessory[] = [];
          if (actorId) {
            accessories.push({
              icon: avatarFor(actorId)
                ? { source: avatarFor(actorId)!, mask: Image.Mask.RoundedRectangle }
                : Icon.Person,
              tooltip: nameFor(actorId),
            });
          }
          accessories.push({ date: new Date(note.created_at) });
          return (
            <List.Item
              key={note.id.note_id}
              icon={Icon.BlankDocument}
              title={noteListTitle(note)}
              subtitle={parent?.title}
              accessories={accessories}
              detail={<List.Item.Detail markdown={note.content_markdown || note.content_plaintext || "*Empty note*"} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>{parent?.url ? <OpenInAttio url={parent.url} /> : null}</ActionPanel.Section>
                  <ActionPanel.Section title="Edit">
                    {satisfied(self.granted, "note:read-write") && (
                      <Action.Push
                        icon={Icon.Pencil}
                        title="Edit Note"
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={<NoteEditForm note={note} onSaved={revalidate} />}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy as Markdown"
                      content={note.content_markdown || note.content_plaintext || ""}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard title="Copy as Plain Text" content={note.content_plaintext || ""} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="View">
                    <Action
                      title="Toggle Sidebar"
                      icon={Icon.AppWindowSidebarRight}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "d" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                      }}
                      onAction={() => setShowDetail((v) => !v)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
