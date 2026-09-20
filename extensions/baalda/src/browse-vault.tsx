import { Action, ActionPanel, Detail, Icon, List, Toast, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listFolders, listNotes, listVaults, readNote, type Folder, type NoteSummary } from "./lib/baalda";

function NotePreview({ docId }: { docId: string }) {
  const { data: note, isLoading } = useCachedPromise((id: string) => readNote(id), [docId]);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={note?.title ?? "Note"}
      markdown={note ? `# ${note.title ?? "Note"}\n\n${note.content}` : "Loading…"}
      actions={
        note && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Content" content={note.content} />
            <Action.Paste title="Paste into Active App" content={note.content} />
          </ActionPanel>
        )
      }
    />
  );
}

function NotesList({ vaultId, vaultName, folder }: { vaultId: string; vaultName: string; folder?: Folder }) {
  const { data: notes, isLoading } = useCachedPromise(
    (vid: string, fid?: string) => listNotes(vid, fid),
    [vaultId, folder?.folderId],
    {
      onError: (e) => void showToast({ style: Toast.Style.Failure, title: "Couldn't list notes", message: String(e) }),
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={folder ? `${vaultName} / ${folder.path}` : vaultName}>
      <List.EmptyView
        icon={Icon.Document}
        title="No notes here"
        description={folder ? `Folder "${folder.path}" is empty` : "This vault is empty"}
      />
      {(notes ?? []).map((n: NoteSummary) => (
        <List.Item
          key={n.docId}
          icon={Icon.Document}
          title={n.title}
          subtitle={n.relPath}
          accessories={n.permission ? [{ tag: n.permission }] : []}
          actions={
            <ActionPanel>
              <Action.Push title="Open Note" icon={Icon.Book} target={<NotePreview docId={n.docId} />} />
              <Action.CopyToClipboard title="Copy Note ID" content={n.docId} shortcut={Keyboard.Shortcut.Common.Copy} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FoldersAndNotes({ vaultId, vaultName }: { vaultId: string; vaultName: string }) {
  const { data: folders, isLoading } = useCachedPromise(listFolders, [vaultId], {
    onError: (e) => void showToast({ style: Toast.Style.Failure, title: "Couldn't list folders", message: String(e) }),
  });

  return (
    <List isLoading={isLoading} navigationTitle={vaultName}>
      <List.Section title="Folders">
        {(folders ?? []).map((f) => (
          <List.Item
            key={f.folderId}
            icon={Icon.Folder}
            title={f.path}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Folder"
                  icon={Icon.ArrowRight}
                  target={<NotesList vaultId={vaultId} vaultName={vaultName} folder={f} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Notes">
        <List.Item
          icon={Icon.Document}
          title="All notes"
          actions={
            <ActionPanel>
              <Action.Push
                title="Open"
                icon={Icon.ArrowRight}
                target={<NotesList vaultId={vaultId} vaultName={vaultName} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function BrowseVault() {
  const { data: vaults, isLoading } = useCachedPromise(listVaults, [], {
    onError: (e) => void showToast({ style: Toast.Style.Failure, title: "Couldn't load vaults", message: String(e) }),
  });

  return (
    <List isLoading={isLoading}>
      <List.EmptyView icon={Icon.HardDrive} title="No vaults" description="No vaults accessible with this MCP token" />
      {(vaults ?? []).map((v) => (
        <List.Item
          key={v.vaultId}
          id={v.vaultId}
          icon={Icon.HardDrive}
          title={v.name}
          subtitle={v.vaultId}
          accessories={v.role ? [{ tag: v.role }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse"
                icon={Icon.ArrowRight}
                target={<FoldersAndNotes vaultId={v.vaultId} vaultName={v.name} />}
              />
              <Action.CopyToClipboard
                title="Copy Vault ID (for Default Vault Preference)"
                content={v.vaultId}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
