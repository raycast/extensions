import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { errorMessage, performMutation, SettingsActions, tagIcon, Warnings } from "./components/shared";
import {
  aggregateTags,
  canonicalTags,
  normalizeTags,
  replaceFiles,
  tagCountLabel,
  tagKey,
  TaggedFile,
} from "./lib/models";
import { loadCatalog, readBatches } from "./lib/service";
import { findPaths } from "./lib/spotlight";
import SearchFilesByTag from "./search-files-by-tag";

function RenameForm({ name, onRename }: { name: string; onRename: (name: string) => Promise<boolean> }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <Form
      navigationTitle={`Rename ${name}`}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Rename"
            icon={Icon.Pencil}
            onSubmit={async () => {
              if (busy) return;
              try {
                const [newName] = normalizeTags([value]);
                if (newName === name) {
                  setError("Enter a different tag name.");
                  return;
                }
                setBusy(true);
                if (await onRename(newName)) pop();
              } catch (cause) {
                setError(errorMessage(cause));
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="New Name"
        value={value}
        onChange={(text) => {
          setValue(text);
          setError(undefined);
        }}
        error={error}
      />
    </Form>
  );
}

export default function Command() {
  const catalog = usePromise(loadCatalog);
  const [updates, setUpdates] = useState<TaggedFile[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const files = replaceFiles(catalog.data?.files ?? [], updates);
  const tags = aggregateTags(files, catalog.data?.palette ?? []).sort((a, b) =>
    getPreferenceValues<Preferences>().sortByCount
      ? b.count - a.count || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name),
  );

  async function changeEverywhere(name: string, newName?: string): Promise<boolean> {
    if (writing.current) return false;
    writing.current = true;
    setBusy(true);
    try {
      const found = await findPaths({ tags: [name], match: "all" });
      const current = await readBatches(found.paths);
      const paths = current.files
        .filter((file) => file.tags.some((tag) => tagKey(tag.name) === tagKey(name)))
        .map((file) => file.path);
      if (!paths.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Indexed Files to Change",
          message: found.warnings[0] ?? "Refresh the list or check your search scope.",
        });
        return false;
      }
      const targetName = newName
        ? canonicalTags(
            [newName],
            tags.filter((tag) => tagKey(tag.name) !== tagKey(name)),
          )[0]
        : undefined;
      const description = targetName ? `Rename “${name}” to “${targetName}”` : `Remove “${name}”`;
      if (
        !(await confirmAlert({
          title: `${description} on ${paths.length} Files?`,
          message: [
            "Only indexed files in your configured search folders are included. Other tags and the files themselves are kept.",
            targetName
              ? "If the destination tag already exists, the tags will be merged."
              : "This cannot be undone automatically.",
            ...found.warnings,
            current.failures.length ? `${current.failures.length} unreadable files will be skipped.` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          primaryAction: { title: targetName ? "Rename Tag" : "Remove Tag", style: Alert.ActionStyle.Destructive },
        }))
      )
        return false;
      const result = await performMutation(
        paths,
        targetName ? { kind: "rename", oldName: name, newName: targetName } : { kind: "remove", tags: [name] },
        targetName ? "Renaming Tag" : "Removing Tag",
      );
      setUpdates((previous) => replaceFiles(previous, result.files));
      return result.failures.length === 0;
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Change Tag", message: errorMessage(error) });
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return (
    <List
      isLoading={catalog.isLoading || busy}
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search Finder tags…"
    >
      {tags
        .filter((tag) => tagKey(tag.name).includes(tagKey(search)))
        .map((tag) => (
          <List.Item
            key={tag.name}
            title={tag.name}
            icon={tagIcon(tag)}
            accessories={[
              {
                text: tagCountLabel(tag.count, catalog.data?.countsArePartial ?? true),
                tooltip: catalog.data?.countsArePartial
                  ? "Search is incomplete. Counts only include files that could be found and read."
                  : "Indexed, readable files in your search folders",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Search Files by Tag"
                  icon={Icon.MagnifyingGlass}
                  target={
                    <SearchFilesByTag
                      initialTags={[tag.name]}
                      onChange={(changes) => setUpdates((previous) => replaceFiles(previous, changes))}
                    />
                  }
                />
                <Action.Push
                  title="Rename Tag Everywhere"
                  icon={Icon.Pencil}
                  target={<RenameForm name={tag.name} onRename={(newName) => changeEverywhere(tag.name, newName)} />}
                />
                <Action
                  title="Remove Tag Everywhere"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => changeEverywhere(tag.name)}
                />
                <Action.CopyToClipboard title="Copy Tag Name" content={tag.name} />
                <Action
                  title="Refresh Tags"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={async () => {
                    await catalog.revalidate();
                    setUpdates([]);
                  }}
                />
                <SettingsActions />
              </ActionPanel>
            }
          />
        ))}
      <List.EmptyView
        title={catalog.error ? "Could Not Load Tags" : "No Tags Found"}
        icon={Icon.Tag}
        description={
          catalog.error
            ? errorMessage(catalog.error)
            : "Tag files in Finder or with Tag Selected Files, then refresh. Check your search folders if tags are missing."
        }
        actions={
          <ActionPanel>
            <Action title="Refresh Tags" icon={Icon.ArrowClockwise} onAction={catalog.revalidate} />
            <SettingsActions />
          </ActionPanel>
        }
      />
      <Warnings warnings={catalog.data?.warnings ?? []} failures={catalog.data?.failures ?? []} />
    </List>
  );
}
