import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { listNotes, listVaults, prefs, type NoteSummary, type Vault } from "./lib/baalda";
import { CreateNoteForm } from "./create-note";
import {
  AppendNoteView,
  DeleteNoteAction,
  EditNoteView,
  MoveNoteView,
  NoteDetailView,
  UpdateNoteView,
} from "./components/note-forms";

function chooseDefaultVault(vaults: Vault[]): string {
  const preferred = prefs().defaultVaultId?.trim().toLowerCase();
  return (
    (preferred &&
      vaults.find((vault) => vault.vaultId.toLowerCase() === preferred || vault.name.toLowerCase() === preferred)
        ?.vaultId) ??
    vaults[0]?.vaultId ??
    ""
  );
}

export default function ManageNotes() {
  const { data: vaults, isLoading: loadingVaults } = useCachedPromise(listVaults, [], {
    onError: (error) => void showFailureToast(error, { title: "Couldn't load vaults" }),
  });
  const [vaultId, setVaultId] = useState("");

  useEffect(() => {
    if (!vaultId && vaults?.length) setVaultId(chooseDefaultVault(vaults));
  }, [vaultId, vaults]);

  const {
    data: notes,
    isLoading: loadingNotes,
    revalidate,
  } = useCachedPromise((id: string) => (id ? listNotes(id) : Promise.resolve([] as NoteSummary[])), [vaultId], {
    onError: (error) => void showFailureToast(error, { title: "Couldn't load notes" }),
  });

  const selectedVault = vaults?.find((vault) => vault.vaultId === vaultId);

  return (
    <List
      isLoading={loadingVaults || loadingNotes}
      searchBarPlaceholder="Filter notes by title or path…"
      searchBarAccessory={
        vaults && vaults.length > 1 ? (
          <List.Dropdown tooltip="Vault" value={vaultId} onChange={setVaultId} storeValue>
            {vaults.map((vault) => (
              <List.Dropdown.Item key={vault.vaultId} title={vault.name} value={vault.vaultId} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Note"
          subtitle="Create a note at any path in the selected vault"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Note"
                icon={Icon.Document}
                target={<CreateNoteForm defaultVaultId={vaultId} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={selectedVault ? selectedVault.name : "Notes"}>
        {(notes ?? []).map((note) => (
          <NoteItem key={note.docId} note={note} onChanged={() => void revalidate()} />
        ))}
      </List.Section>
    </List>
  );
}

function NoteItem({ note, onChanged }: { note: NoteSummary; onChanged: () => void }) {
  return (
    <List.Item
      icon={Icon.Document}
      title={note.title}
      subtitle={note.relPath}
      accessories={[
        ...(note.permission ? [{ tag: note.permission }] : []),
        ...(note.updatedAt ? [{ date: new Date(note.updatedAt) }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Note"
            icon={Icon.Book}
            target={<NoteDetailView docId={note.docId} onChanged={onChanged} />}
          />
          <Action.Push
            title="Append to Note"
            icon={Icon.Plus}
            target={<AppendNoteView docId={note.docId} onDone={onChanged} />}
          />
          <Action.Push
            title="Replace Note Content"
            icon={Icon.Pencil}
            target={<UpdateNoteView docId={note.docId} onDone={onChanged} />}
          />
          <Action.Push
            title="Make Targeted Edit"
            icon={Icon.Wand}
            target={<EditNoteView docId={note.docId} onDone={onChanged} />}
          />
          <Action.Push
            title="Move or Rename Note"
            icon={Icon.ArrowRight}
            target={<MoveNoteView docId={note.docId} onDone={onChanged} />}
          />
          <DeleteNoteAction note={note} onDeleted={onChanged} />
          <Action.CopyToClipboard title="Copy Note ID" content={note.docId} />
        </ActionPanel>
      }
    />
  );
}
