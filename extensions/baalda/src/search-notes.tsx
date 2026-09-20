import { Action, ActionPanel, Detail, Form, Icon, List, Toast, showToast, useNavigation, Keyboard } from "@raycast/api";
import { FormValidation, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import {
  appendNote,
  listVaults,
  readNote,
  searchNotes,
  type NoteContent,
  type SearchResult,
  type Vault,
} from "./lib/baalda";

/* ── Append-to-note form ────────────────────────────────────────────────── */

function AppendView({ note, onDone }: { note: NoteContent; onDone: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Appending…" });
      try {
        await appendNote(note.docId, `\n${values.text.trim()}\n`, {
          idempotencyKey: crypto.randomUUID(),
          expectedRevision: note.revision,
        });
        toast.style = Toast.Style.Success;
        toast.title = `Appended to "${note.title ?? "note"}"`;
        onDone();
        pop();
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Append failed";
        toast.message = e instanceof Error ? e.message : String(e);
      }
    },
    validation: { text: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle={`Append to "${note.title ?? "note"}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Append" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text to append"
        placeholder="Markdown to append to the end of the note…"
        {...itemProps.text}
        autoFocus
      />
    </Form>
  );
}

/* ── Note detail view ───────────────────────────────────────────────────── */

function NoteDetail({ docId }: { docId: string }) {
  const { data: note, isLoading, revalidate } = useCachedPromise((id: string) => readNote(id), [docId]);

  const markdown = note ? `# ${note.title ?? "Note"}\n\n${note.content}` : "Loading…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={note?.title ?? "Note"}
      metadata={
        note && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Path" text={note.relPath ?? "Unknown"} />
            <Detail.Metadata.Label title="Doc ID" text={note.docId} />
            {note.revision && <Detail.Metadata.Label title="Revision" text={note.revision.slice(0, 12)} />}
          </Detail.Metadata>
        )
      }
      actions={
        note && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Content" content={note.content} />
            <Action.Paste title="Paste into Active App" content={note.content} />
            <Action.Push
              title="Append to Note"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<AppendView note={note} onDone={revalidate} />}
            />
          </ActionPanel>
        )
      }
    />
  );
}

/* ── Search list ────────────────────────────────────────────────────────── */

export default function SearchNotes() {
  const [query, setQuery] = useCachedState<string>("search-query", "");
  const [vaultFilter, setVaultFilter] = useCachedState<string>("search-vault-filter", "all");

  const { data: vaults, isLoading: loadingVaults } = useCachedPromise(listVaults, [], {
    onError: (e) => void showToast({ style: Toast.Style.Failure, title: "Couldn't load vaults", message: String(e) }),
  });

  const { data: results, isLoading: searching } = useCachedPromise(
    async (q: string, filter: string, allVaults: Vault[] | undefined) => {
      if (!q.trim() || !allVaults?.length) return [] as (SearchResult & { vaultName: string })[];
      const targets = filter === "all" ? allVaults : allVaults.filter((v) => v.vaultId === filter);
      const settled = await Promise.allSettled(
        targets.map(async (v) => (await searchNotes(v.vaultId, q, 10)).map((r) => ({ ...r, vaultName: v.name }))),
      );
      return settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
    },
    [query, vaultFilter, vaults],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={loadingVaults || searching}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your second brain…"
      throttle
      searchBarAccessory={
        vaults && vaults.length > 1 ? (
          <List.Dropdown tooltip="Vault" value={vaultFilter} onChange={setVaultFilter} storeValue>
            <List.Dropdown.Item title="All Vaults" value="all" />
            {vaults.map((v) => (
              <List.Dropdown.Item key={v.vaultId} title={v.name} value={v.vaultId} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query.trim() ? "No notes found" : "Search Baalda"}
        description={query.trim() ? `No matches for "${query}"` : "Semantic + keyword search across your vaults"}
      />
      {(results ?? []).map((r) => (
        <List.Item
          key={`${r.vaultName}-${r.docId}`}
          icon={Icon.Document}
          title={r.title ?? r.relPath ?? r.docId}
          subtitle={r.relPath}
          accessories={[{ tag: r.vaultName }]}
          actions={
            <ActionPanel>
              <Action.Push title="Open Note" icon={Icon.Book} target={<NoteDetail docId={r.docId} />} />
              <Action.CopyToClipboard title="Copy Note ID" content={r.docId} shortcut={Keyboard.Shortcut.Common.Copy} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
