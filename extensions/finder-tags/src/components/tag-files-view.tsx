import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { aggregateTags, FileBatch, Mutation, replaceFiles, tagKey, TaggedFile } from "../lib/models";
import { readPalette } from "../lib/native";
import { loadCatalog, readBatches } from "../lib/service";
import { errorMessage, performMutation, SettingsActions, tagIcon, Warnings } from "./shared";

export default function TagFilesView({
  paths,
  onChange,
  onDone,
  closeAfterTagging = false,
}: {
  paths: string[];
  onChange?: (files: TaggedFile[]) => void;
  onDone?: () => void;
  closeAfterTagging?: boolean;
}) {
  const selection = usePromise(readBatches, [paths]);
  const catalog = usePromise(loadCatalog, [], { onError: () => undefined });
  const palette = usePromise(readPalette);
  const [updates, setUpdates] = useState<TaggedFile[]>([]);
  const [failures, setFailures] = useState<FileBatch["failures"]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const files = replaceFiles(selection.data?.files ?? [], updates);
  const visibleFailures = [
    ...new Map(
      [
        ...(selection.data?.failures ?? []).filter((failure) => !updates.some((file) => file.path === failure.path)),
        ...failures,
      ].map((failure) => [failure.path, failure]),
    ).values(),
  ];
  const knownFiles = replaceFiles(catalog.data?.files ?? [], files);
  const sortByCount = getPreferenceValues<Preferences>().sortByCount;
  const tags = aggregateTags(knownFiles, palette.data?.tags ?? []).sort(
    (a, b) => (sortByCount ? b.count - a.count : 0) || a.name.localeCompare(b.name),
  );
  const name = search.trim();
  const create = name && !tags.some((tag) => tagKey(tag.name) === tagKey(name));
  const visible = tags.filter((tag) => tagKey(tag.name).includes(tagKey(name)));

  async function change(mutation: Mutation) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    try {
      const result = await performMutation(paths, mutation, "Updating Tags");
      setUpdates((previous) => replaceFiles(previous, result.files));
      setFailures(result.failures);
      onChange?.(result.files);
      if (!result.failures.length) {
        if (closeAfterTagging && getPreferenceValues<Preferences>().closeAfterTagging)
          await showHUD(`Updated tags on ${result.files.length} files`);
        else onDone?.();
      }
    } catch {
      /* The progress toast reports native and transport failures. */
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const secondaryActions = (
    <>
      <Action
        title="Remove All Tags"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        onAction={async () => {
          if (
            await confirmAlert({
              title: `Remove All Tags from ${paths.length} Files?`,
              message: "Every Finder tag on these selected files will be removed. The files will stay in place.",
              primaryAction: { title: "Remove All Tags", style: Alert.ActionStyle.Destructive },
            })
          )
            await change({ kind: "set", tags: [] });
        }}
      />
      <Action.CopyToClipboard
        title="Copy Tags"
        content={files.map((file) => `${file.path}: ${file.tags.map((tag) => tag.name).join(", ")}`).join("\n")}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <SettingsActions />
    </>
  );

  return (
    <List
      navigationTitle={`Tag ${paths.length} Selected ${paths.length === 1 ? "File" : "Files"}`}
      isLoading={selection.isLoading || catalog.isLoading || busy}
      searchText={search}
      onSearchTextChange={setSearch}
      filtering={false}
      searchBarPlaceholder="Find a tag or type a new name…"
    >
      {create && (
        <List.Item
          title={`Create Tag “${name}”`}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Create and Apply Tag"
                icon={Icon.Plus}
                onAction={() => change({ kind: "add", tags: [name] })}
              />
              {secondaryActions}
            </ActionPanel>
          }
        />
      )}
      {visible.map((tag) => {
        const count = files.filter((file) => file.tags.some((item) => tagKey(item.name) === tagKey(tag.name))).length;
        const all = count === paths.length;
        return (
          <List.Item
            key={tag.name}
            title={tag.name}
            icon={tagIcon(tag)}
            accessories={
              all
                ? [{ icon: Icon.Checkmark, tooltip: "On every selected file" }]
                : count
                  ? [{ icon: Icon.CircleProgress50, text: `${count} of ${paths.length}` }]
                  : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={all ? "Remove Tag" : "Apply Tag"}
                  icon={all ? Icon.Minus : Icon.Plus}
                  onAction={() => change({ kind: all ? "remove" : "add", tags: [tag.name] })}
                />
                {secondaryActions}
              </ActionPanel>
            }
          />
        );
      })}
      {!create && !visible.length && (
        <List.EmptyView
          title={selection.error ? "Could Not Read Selected Files" : "Type a Tag Name"}
          description={
            selection.error ? errorMessage(selection.error) : "Create a tag by typing its name and pressing Enter."
          }
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Tags"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await selection.revalidate();
                  await catalog.revalidate();
                }}
              />
              {secondaryActions}
            </ActionPanel>
          }
        />
      )}
      <Warnings warnings={[]} failures={visibleFailures} />
    </List>
  );
}
