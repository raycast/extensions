import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { errorMessage, performMutation, SettingsActions, tagColor, tagIcon, Warnings } from "./components/shared";
import TagFilesView from "./components/tag-files-view";
import { aggregateTags, Match, matchesTags, replaceFiles, tagKey, TaggedFile, TagCount } from "./lib/models";
import { loadCatalog } from "./lib/service";

function ChooseTags({
  tags,
  selected,
  match,
  onChoose,
}: {
  tags: TagCount[];
  selected: string[];
  match: Match;
  onChoose: (tags: string[], match: Match) => void;
}) {
  const { pop } = useNavigation();
  const [chosen, setChosen] = useState(selected);
  const [mode, setMode] = useState<Match>(match);
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Match Multiple Tags"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Find Files"
            icon={Icon.MagnifyingGlass}
            onSubmit={() => {
              if (!chosen.length) {
                setError("Choose at least one tag.");
                return;
              }
              onChoose(chosen, mode);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="tags"
        title="Tags"
        value={chosen}
        onChange={(value) => {
          setChosen(value);
          setError(undefined);
        }}
        error={error}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.name} value={tag.name} title={tag.name} icon={tagIcon(tag)} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id="match"
        title="Match"
        value={mode}
        onChange={(value) => setMode(value === "all" ? "all" : "any")}
      >
        <Form.Dropdown.Item value="all" title="All of These Tags" />
        <Form.Dropdown.Item value="any" title="Any of These Tags" />
      </Form.Dropdown>
    </Form>
  );
}

export default function SearchFilesByTag({
  initialTags = [],
  onChange,
}: {
  initialTags?: string[];
  onChange?: (files: TaggedFile[]) => void;
}) {
  const { push, pop } = useNavigation();
  const catalog = usePromise(loadCatalog);
  const [updates, setUpdates] = useState<TaggedFile[]>([]);
  const [selected, setSelected] = useState(initialTags);
  const [match, setMatch] = useState<Match>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(200);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const files = replaceFiles(catalog.data?.files ?? [], updates);
  const tags = aggregateTags(files, catalog.data?.palette ?? []).sort((a, b) =>
    getPreferenceValues<Preferences>().sortByCount
      ? b.count - a.count || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name),
  );
  const results = files
    .filter((file) => matchesTags(file, selected, match) && tagKey(file.name).includes(tagKey(search)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const dropdownValue = selected.length === 0 ? "all-files" : selected.length === 1 ? `tag:${selected[0]}` : "multiple";
  function applyUpdates(changes: TaggedFile[]) {
    setUpdates((previous) => replaceFiles(previous, changes));
    onChange?.(changes);
  }
  function chooseMultiple() {
    push(
      <ChooseTags
        tags={tags}
        selected={selected}
        match={match}
        onChoose={(values, mode) => {
          setSelected(values);
          setMatch(mode);
          setLimit(200);
        }}
      />,
    );
  }
  async function remove(file: TaggedFile, tag: string) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    try {
      const result = await performMutation([file.path], { kind: "remove", tags: [tag] }, `Removing ${tag}`);
      applyUpdates(result.files);
    } catch {
      /* The progress toast reports the error. */
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return (
    <List
      navigationTitle="Search Files by Tag"
      isShowingDetail
      isLoading={catalog.isLoading || busy}
      filtering={false}
      searchText={search}
      onSearchTextChange={(value) => {
        setSearch(value);
        setLimit(200);
      }}
      searchBarPlaceholder="Filter by file name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Finder tag"
          value={dropdownValue}
          onChange={(value) => {
            if (value === "choose-multiple") {
              chooseMultiple();
              return;
            }
            if (value === "multiple") return;
            setSelected(value === "all-files" ? [] : [value.slice(4)]);
            setLimit(200);
          }}
        >
          <List.Dropdown.Item title="All Tagged Files" value="all-files" />
          <List.Dropdown.Item title="Match All of…" value="choose-multiple" icon={Icon.List} />
          {selected.length > 1 && (
            <List.Dropdown.Item title={`${match === "all" ? "All" : "Any"}: ${selected.join(", ")}`} value="multiple" />
          )}
          <List.Dropdown.Section title="Tags">
            {tags.map((tag) => (
              <List.Dropdown.Item
                key={tag.name}
                title={catalog.data?.countsArePartial ? tag.name : `${tag.name} (${tag.count})`}
                value={`tag:${tag.name}`}
                icon={tagIcon(tag)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`${results.length} ${results.length === 1 ? "File" : "Files"}`}>
        {results.slice(0, limit).map((file) => (
          <List.Item
            key={file.path}
            title={file.name}
            icon={{ fileIcon: file.path }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {file.tags.map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={tag.name}
                          text={tag.name}
                          color={tagColor(tag)}
                          onAction={() => {
                            setSelected([tag.name]);
                            setSearch("");
                          }}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Kind" text={file.kind} />
                    <List.Item.Detail.Metadata.Label
                      title="Size"
                      text={`${Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(file.size / 1024)} KB`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Label title="Path" text={file.path} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            quickLook={{ path: file.path, name: file.name }}
            actions={
              <ActionPanel>
                <Action.Open title="Open" target={file.path} />
                <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd"], key: "return" }} />
                <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={file.path}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.Push
                  title="Add or Remove Tags"
                  icon={Icon.Tag}
                  target={<TagFilesView paths={[file.path]} onChange={applyUpdates} onDone={pop} />}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                {selected.length === 1 ? (
                  <Action
                    title={`Remove Tag “${selected[0]}”`}
                    icon={Icon.Minus}
                    onAction={() => remove(file, selected[0])}
                  />
                ) : (
                  <ActionPanel.Submenu title="Remove Tag" icon={Icon.Minus}>
                    {file.tags.map((tag) => (
                      <Action
                        key={tag.name}
                        title={tag.name}
                        icon={tagIcon(tag)}
                        onAction={() => remove(file, tag.name)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                <Action title="Choose Multiple Tags" icon={Icon.List} onAction={chooseMultiple} />
                <Action
                  title="Refresh Files"
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
      </List.Section>
      {results.length > limit && (
        <List.Item
          title={`Show More Files (${results.length - limit} Remaining)`}
          icon={Icon.Ellipsis}
          actions={
            <ActionPanel>
              <Action title="Show More Files" onAction={() => setLimit((value) => value + 200)} />
            </ActionPanel>
          }
        />
      )}
      <List.EmptyView
        title={catalog.error ? "Could Not Search Files" : "No Matching Files"}
        icon={Icon.MagnifyingGlass}
        description={
          catalog.error
            ? errorMessage(catalog.error)
            : "Try another tag or file name. Search only includes Spotlight-indexed files in your configured folders."
        }
        actions={
          <ActionPanel>
            <Action title="Refresh Files" icon={Icon.ArrowClockwise} onAction={catalog.revalidate} />
            <Action title="Choose Multiple Tags" icon={Icon.List} onAction={chooseMultiple} />
            <SettingsActions />
          </ActionPanel>
        }
      />
      <Warnings warnings={catalog.data?.warnings ?? []} failures={catalog.data?.failures ?? []} />
    </List>
  );
}
