import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { deleteCorpus, getCorpora, getCorpus, nukeCorpora, printLocalStorage } from "./helpers/storage";
import { Corpus } from "./types";
import { UUID } from "crypto";

function Dropdown() {
  return (
    <List.Dropdown tooltip="Filter">
      <List.Dropdown.Item title="All" value="All" />
      <List.Dropdown.Section title="Types">
        <List.Dropdown.Item title="Codebase" value="Codebase" />
        <List.Dropdown.Item title="Markdown" value="Markdown" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function ManageCorpora() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<Corpus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const items = await getCorpora();
      if (items) setItems(items);
    } catch {
      console.error("Failed to fetch Corpora");
    }
    setIsLoading(false);
  };

  const filteredItems = items.filter((item) => item.title.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<Dropdown />}
      searchBarPlaceholder="Search..."
    >
      {searchText === "" && items.length === 0 ? (
        <List.EmptyView icon="📂" title="No results!" description="Try adding a New Corpus..." actions={emptyActions} />
      ) : searchText !== "" && filteredItems.length === 0 ? (
        <List.EmptyView icon="😩" title="No results!" description="Try a different search..." actions={emptyActions} />
      ) : (
        <List.Section title="Results" subtitle={filteredItems.length.toString()}>
          {filteredItems.map((item) => (
            <List.Item key={item.id} title={item.title} actions={actions(item, loadItems)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

const newCorpus = async () => {
  await launchCommand({
    name: "new-corpus",
    type: LaunchType.UserInitiated,
  });
};

const editCorpus = async (itemId: UUID) => {
  const corpus: Corpus | undefined = await getCorpus(itemId);
  if (!corpus) return;
  await launchCommand({
    name: "new-corpus",
    type: LaunchType.UserInitiated,
    context: corpus, // Pass as launchContext
  });
};

const emptyActions = (
  <ActionPanel>
    <Action title="New Corpus" icon={Icon.PlusTopRightSquare} onAction={async () => newCorpus()} />
    <Action
      title="Print Local Storage"
      icon={Icon.Box}
      onAction={async () => await printLocalStorage()}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "return" },
        windows: { modifiers: ["ctrl", "shift"], key: "return" },
      }}
    />
  </ActionPanel>
);

const actions = (item: Corpus, reload: () => void) => {
  return (
    <ActionPanel title={item.title}>
      <Action.CopyToClipboard title="Copy Context" content={"clipboard copy of all markdown context documents"} />
      <Action.ShowInFinder title="Show in Finder" path={item.folder} />
      <ActionPanel.Section>
        <Action
          title="New Corpus"
          icon={Icon.PlusTopRightSquare}
          onAction={async () => {
            await newCorpus();
            reload();
          }}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, windows: { modifiers: ["ctrl"], key: "n" } }}
        />
        <Action
          title="Edit Corpus"
          icon={Icon.Pencil}
          onAction={async () => {
            await editCorpus(item.id);
            reload();
          }}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "e" }, windows: { modifiers: ["ctrl"], key: "e" } }}
        />
        <Action
          title="Delete Corpus"
          icon={Icon.XMarkTopRightSquare}
          style={Action.Style.Destructive}
          onAction={async () => {
            await deleteCorpus(item.id);
            reload();
          }}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, windows: { modifiers: ["ctrl"], key: "d" } }}
        />
        <Action
          title="Nuke Corpora"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            await nukeCorpora();
            reload();
          }}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
        />
      </ActionPanel.Section>
      <Action.Push
        title="View Context"
        icon={Icon.Book}
        target={
          <List isShowingDetail={true}>
            <List.Item title="README" />
            <List.Item title="CHANGELOG" />
          </List>
        }
        shortcut={{ macOS: { modifiers: ["cmd"], key: "v" }, windows: { modifiers: ["ctrl"], key: "v" } }}
      />
      <Action
        title="Print Local Storage"
        icon={Icon.Box}
        onAction={async () => await printLocalStorage()}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "return" },
          windows: { modifiers: ["ctrl", "shift"], key: "return" },
        }}
      />
    </ActionPanel>
  );
};
