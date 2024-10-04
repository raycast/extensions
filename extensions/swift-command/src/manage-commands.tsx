import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";

import { useEffect, useMemo, useState } from "react";
import { getDatasourceFolderPath, getDatasourcePath } from "./perference";
import { createDataSource, DataItem, DataSource } from "./datasource";
import { commandFilter } from "./filter";
import { ActionDataItem, ArgumentForm, CommandForm } from "./form";

export function filterCommand(cmds: DataItem[], searchKey: string) {
  if (searchKey === "") {
    return cmds;
  }

  return cmds.filter((item: DataItem) => {
    return commandFilter(item, searchKey);
  });
}

export default function Command() {
  const [searchBarText, setSearchBarText] = useState("");
  const [fullItems, setFullItems] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);

  const filePath = getDatasourcePath();

  useEffect(() => {
    try {
      const dataSource = createDataSource(filePath);
      setDataSource(dataSource);
      setFullItems(dataSource.getAll());
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data source",
        message: error as string,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const items = useMemo(() => {
    // searchBarText changed
    return filterCommand(fullItems, searchBarText);
  }, [fullItems, searchBarText]);

  function refreshList() {
    if (!dataSource) return;

    setSearchBarText("");
    setIsLoading(true);

    try {
      setFullItems(dataSource.getAll());
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh list",
        message: error as string,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreate(cmd: ActionDataItem) {
    if (!dataSource) return;

    try {
      dataSource.add(cmd.data, cmd.remark, cmd.args || []);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create command",
        message: error as string,
      });
    }
    refreshList();
  }

  function handleDelete(id: string): void {
    if (!dataSource) return;

    try {
      dataSource.delete(id);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete command",
        message: error as string,
      });
    }
    refreshList();
  }

  function handleUpdate(updatedCmd: ActionDataItem) {
    if (!dataSource) return;

    try {
      dataSource.update(updatedCmd.id, updatedCmd.data, updatedCmd.remark, updatedCmd.args || []);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update command",
        message: error as string,
      });
    }
    refreshList();
  }

  function handlePaste(cmd: ActionDataItem) {
    if (!dataSource) return;

    try {
      dataSource.updateLastUsedTime(cmd.id);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create command",
        message: error as string,
      });
    }
  }

  return (
    <List
      onSearchTextChange={setSearchBarText}
      searchBarPlaceholder="Search or create your command..."
      actions={
        <ActionPanel>
          <CreateCommandAction onCreate={handleCreate} command={searchBarText} />
          <OpenDataFileFolderAction />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {items.map((item) => (
        <CommandListItem
          key={item.data}
          item={item}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onCreate={handleCreate}
          onPaste={handlePaste}
          refreshList={refreshList}
          searchBarText={searchBarText}
        />
      ))}
    </List>
  );
}

function CreateCommandAction(props: { onCreate: (newItem: ActionDataItem) => void; command: string }) {
  const emptyCmd: ActionDataItem = { id: "", data: props.command, remark: "" };

  return (
    <Action.Push
      icon={Icon.NewDocument}
      title="Create Command"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CommandForm onCreate={props.onCreate} cmd={emptyCmd} />}
    />
  );
}

function OpenDataFileFolderAction() {
  return (
    <Action.Open
      title="Open Data File Folder"
      target={getDatasourceFolderPath()}
      icon={Icon.Folder}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
  );
}

function CommandListItem(props: {
  item: DataItem;
  onDelete: (id: string) => void;
  onUpdate: (cmd: ActionDataItem) => void;
  onCreate: (cmd: ActionDataItem) => void;
  onPaste: (cmd: ActionDataItem) => void;
  searchBarText: string;
  refreshList: () => void;
}) {
  function handlePaste() {
    props.onPaste(props.item);
    props.refreshList();
  }

  return (
    <List.Item
      title={props.item.data}
      key={props.item.data}
      subtitle={props.item.remark}
      actions={
        <ActionPanel>
          {(props.item.args?.length || 0) === 0 ? (
            <Action.Paste title="Paste" content={props.item.data} icon={Icon.Clipboard} onPaste={handlePaste} />
          ) : (
            <Action.Push
              icon={Icon.NewDocument}
              title="Fill Arguments"
              target={<ArgumentForm cmd={props.item} onPaste={handlePaste} />}
            />
          )}
          <Action.CopyToClipboard title="Copy Command" content={props.item.data} />
          <CreateCommandAction onCreate={props.onCreate} command={props.searchBarText} />
          <Action.Push
            title="Edit Command"
            target={<CommandForm onCreate={props.onUpdate} cmd={props.item} />}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Delete Command"
            onAction={() => props.onDelete(props.item.id)}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            style={Action.Style.Destructive}
          />
          <OpenDataFileFolderAction />
        </ActionPanel>
      }
    />
  );
}
