import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert } from "@raycast/api";
import { useMemo, useState } from "react";
import EntryForm from "./entry-form";
import UnlockView from "./unlock";
import { copyOnly, copyPasteSecret } from "./clipboard";
import { vaultPath } from "./preferences";
import { entriesInGroup, groupsSorted, searchEntries } from "./query";
import { clearMaster, isUnlocked, loadOrThrow, persistVault } from "./session";
import { removeEntry, vaultExists } from "./vault";
import { Entry, Vault } from "./types";

export default function SearchCommand() {
  const dir = vaultPath();
  // THE FIX: check whether the master password is actually in memory,
  // not whether the vault file exists. vaultExists() was always true after
  // first creation, so onUnlocked() flipped a flag that was already true
  // and the unlock form re-rendered forever.
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");

  // `tick` bumps to force a re-read of the vault after any mutation
  const vault: Vault | null = useMemo(() => {
    if (!unlocked) return null;
    try {
      return loadOrThrow(dir);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, unlocked, tick]);

  if (!vault) return <UnlockView dir={dir} onUnlocked={() => setUnlocked(true)} />;

  return (
    <SearchView
      vault={vault}
      query={query}
      onQueryChange={setQuery}
      onMutate={() => setTick((t) => t + 1)}
      onLock={() => {
        clearMaster();
        setUnlocked(false);
      }}
      dir={dir}
    />
  );
}

function SearchView(props: {
  vault: Vault;
  query: string;
  onQueryChange: (q: string) => void;
  onMutate: () => void;
  onLock: () => void;
  dir: string;
}) {
  const { vault, query, onQueryChange, onMutate } = props;

  const results = useMemo(() => searchEntries(vault, query), [vault, query]);
  const groups = groupsSorted(vault);

  async function handleCopy(entry: Entry): Promise<void> {
    await copyOnly(entry.password);
    await showToast({ style: Toast.Style.Success, title: `Copied ${entry.slug}` });
  }

  async function handleDelete(entry: Entry): Promise<void> {
    const confirmed = await confirmAlert({
      title: `Delete ${entry.slug}?`,
      message: "This removes the entry permanently from the encrypted vault.",
    });
    if (!confirmed) return;
    const v = loadOrThrow(props.dir);
    removeEntry(v, entry.slug);
    persistVault(props.dir, v);
    await showToast({ style: Toast.Style.Success, title: `Deleted ${entry.slug}` });
    onMutate();
  }

  return (
    <List
      searchText={query}
      onSearchTextChange={onQueryChange}
      searchBarPlaceholder="Search slug, group, metadata — or pass:x / group:y / meta:z"
      throttle
      navigationTitle="UniKey"
    >
      {!query && (
        <List.Section title="Quick Actions">
          <List.Item
            key="__add"
            title="Add Password…"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Password"
                  target={
                    <EntryForm
                      dir={props.dir}
                      groups={groups.map((g) => g.name)}
                      onSaved={() => {
                        onMutate();
                      }}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!query && groups.length > 0 && (
        <List.Section title="Groups">
          {groups.map((g) => (
            <List.Item
              key={`group-${g.name}`}
              title={g.name}
              subtitle={`${entriesInGroup(vault, g.name).length} entries`}
              icon={Icon.Folder}
              keywords={[g.name]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Group"
                    target={<GroupView dir={props.dir} groupName={g.name} onMutate={onMutate} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title={query ? "Results" : "All Passwords"}>
        {results.map((entry) => (
          <List.Item
            key={entry.slug}
            title={entry.slug}
            subtitle={entry.username ?? entry.group ?? ""}
            accessories={[
              ...(entry.group ? [{ text: entry.group }] : []),
              ...(entry.url ? [{ icon: Icon.Link }] : []),
            ]}
            keywords={[entry.group ?? "", entry.username ?? "", ...Object.values(entry.metadata ?? {})]}
            actions={
<ActionPanel>
                <Action
                  title="Copy & Paste"
                  shortcut={{ modifiers: [], key: "enter" }}
                  onAction={() => copyPasteSecret(entry.password)}
                />
                <Action
                  title="Copy Password Only"
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => handleCopy(entry)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <EntryForm
                        dir={props.dir}
                        existing={entry}
                        groups={groups.map((g) => g.name)}
                        onSaved={() => {
                          onMutate();
                        }}
                      />
                    }
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(entry)}
                  />
                </ActionPanel.Section>
                {entry.url && <Action.OpenInBrowser url={entry.url} title="Open URL" />}
                <ActionPanel.Section title="Vault">
                  <Action
                    title="Lock Vault"
                    icon={Icon.Lock}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() => {
                      clearMaster();
                      props.onLock();
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {query && results.length === 0 && (
        <List.EmptyView title="No matches" description="Try pass:github, group:work, meta:foo, or plain text" />
      )}
    </List>
  );
}

function GroupView(props: { dir: string; groupName: string; onMutate: () => void }) {
  const vault = loadOrThrow(props.dir);
  const entries = entriesInGroup(vault, props.groupName);
  const groups = groupsSorted(vault);

  return (
    <List navigationTitle={props.groupName} searchBarPlaceholder={`Filter ${props.groupName}`} filtering>
      <List.Section title={props.groupName}>
        {entries.map((entry) => (
          <List.Item
            key={entry.slug}
            title={entry.slug}
            subtitle={entry.username ?? ""}
            accessories={[...(entry.url ? [{ icon: Icon.Link }] : [])]}
            keywords={[entry.username ?? ""]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy & Paste"
                  shortcut={{ modifiers: [], key: "enter" }}
                  onAction={() => copyPasteSecret(entry.password)}
                />
                <Action.CopyToClipboard content={entry.password} title="Copy Password Only" />
                <Action.Push
                  title="Edit"
                  target={
                    <EntryForm
                      dir={props.dir}
                      existing={entry}
                      groups={groups.map((g) => g.name)}
                      onSaved={props.onMutate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {entries.length === 0 && <List.EmptyView title="Group is empty" description="Add passwords to this group" />}
    </List>
  );
}
