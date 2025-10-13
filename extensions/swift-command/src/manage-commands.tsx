import { ActionPanel, List, Action, Icon, showToast, Toast, confirmAlert, Clipboard, Image } from "@raycast/api";
import { execSync } from "child_process";

import { useEffect, useMemo, useState } from "react";
import { getDatasourceFolderPath, getDatasourcePath } from "./preference";
import { createDataSource, DataItem, DataSource } from "./datasource";
import { commandFilter } from "./filter";
import { ActionDataItem, ArgumentForm, CommandForm } from "./form";
import { useFrontmostApp } from "./useFrontmostApp";

export function filterCommand(cmds: DataItem[], searchKey: string) {
  if (searchKey === "") {
    return cmds;
  }

  return cmds.filter((item: DataItem) => {
    return commandFilter(item, searchKey);
  });
}

// Function to execute command in Terminal
function executeInTerminal(command: string) {
  try {
    // Properly escape the command for AppleScript
    const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");

    // Execute in Terminal.app
    execSync(`osascript -e 'tell application "Terminal" to do script "${escapedCommand}" activate'`);

    showToast({
      style: Toast.Style.Success,
      title: "Command opened in Terminal",
    });
  } catch (error) {
    console.error("Failed to execute in Terminal:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to execute command",
      message: error as string,
    });
  }
}

export default function Command() {
  const [searchBarText, setSearchBarText] = useState("");
  const [fullItems, setFullItems] = useState<DataItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

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
    if (fullItems === null) {
      return null;
    }

    return filterCommand(fullItems, searchBarText);
  }, [fullItems, searchBarText]);

  const frontmostApps = useFrontmostApp();
  const pasteTitle = useMemo(() => {
    if (frontmostApps.data && frontmostApps.data.length > 0) {
      return `Paste to ${frontmostApps.data[0].name}`;
    }
    return "Paste to Frontmost App";
  }, [frontmostApps.data]);

  const pasteIcon = useMemo(() => {
    if (frontmostApps.data && frontmostApps.data.length > 0) {
      return { fileIcon: frontmostApps.data[0].path } as Image.ImageLike;
    }
    return Icon.AppWindow as Image.ImageLike;
  }, [frontmostApps.data]);

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

  async function handleDeleteAll(): Promise<void> {
    if (!dataSource) return;

    const options = {
      title: "Delete All Commands",
      message: "Are you sure you want to delete all commands? This action cannot be undone.",
      icon: Icon.Trash,
    };

    if (await confirmAlert(options)) {
      try {
        // Delete each item using the dataSource
        const itemsToDelete = [...(fullItems || [])];

        if (itemsToDelete.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No commands to delete",
          });
          return;
        }

        setIsLoading(true);

        for (const item of itemsToDelete) {
          dataSource.delete(item.id);
        }

        showToast({
          style: Toast.Style.Success,
          title: "All commands deleted",
          message: `Successfully deleted ${itemsToDelete.length} commands`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete all commands",
          message: error as string,
        });
      } finally {
        refreshList();
      }
    }
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
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Toggle Detail View"
          storeValue={true}
          onChange={(newValue) => {
            setIsShowingDetail(newValue === "detail");
          }}
        >
          <List.Dropdown.Item title="Hide Details" value="list" />
          <List.Dropdown.Item title="Show Details" value="detail" />
        </List.Dropdown>
      }
    >
      {items === null ? null : (
        <>
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
              onDeleteAll={handleDeleteAll}
              pasteTitle={pasteTitle}
              pasteIcon={pasteIcon}
            />
          ))}

          {items !== null && items.length === 0 && (
            <List.EmptyView
              title="No commands"
              description="Create a new command with the search bar above"
              actions={
                <ActionPanel>
                  <CreateCommandAction onCreate={handleCreate} command={searchBarText} />
                  <Action
                    title="Delete All Commands"
                    onAction={handleDeleteAll}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    style={Action.Style.Destructive}
                  />
                  <OpenDataFileFolderAction />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
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
  onDeleteAll: () => Promise<void>;
  pasteTitle: string;
  pasteIcon: Image.ImageLike;
}) {
  function handlePaste() {
    props.onPaste(props.item);
    props.refreshList();
  }

  function handleExecuteInTerminal() {
    executeInTerminal(props.item.data);
    props.onPaste(props.item);
  }

  // Prepare arguments for display
  const argsDisplay =
    props.item.args && props.item.args.length > 0
      ? props.item.args.map((arg) => `- **${arg.name}**: ${arg.value || "(empty)"}`).join("\n")
      : "No arguments";

  return (
    <List.Item
      title={props.item.data}
      key={props.item.id}
      subtitle={props.item.remark}
      detail={
        <List.Item.Detail
          markdown={`## Command Details

### Command
\`\`\`bash
${props.item.data}
\`\`\`

${props.item.remark ? `### Description\n${props.item.remark}\n\n` : ""}

### Arguments
${argsDisplay}

### Command ID
\`${props.item.id}\`
`}
        />
      }
      accessories={[
        {
          text: props.item.args?.length ? `Arguments: ${props.item.args.length}` : "",
          icon: props.item.args?.length ? Icon.Document : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          {(props.item.args?.length || 0) === 0 ? (
            <Action
              title={props.pasteTitle}
              icon={props.pasteIcon}
              onAction={async () => {
                await Clipboard.paste(props.item.data);
                handlePaste();
              }}
            />
          ) : (
            <Action.Push
              icon={Icon.NewDocument}
              title="Fill Arguments"
              target={
                <ArgumentForm
                  cmd={props.item}
                  onPaste={handlePaste}
                  pasteTitle={props.pasteTitle}
                  pasteIcon={props.pasteIcon}
                />
              }
            />
          )}
          <Action.CopyToClipboard title="Copy Command" content={props.item.data} />
          <Action
            title="Execute in Terminal"
            icon={Icon.Terminal}
            onAction={handleExecuteInTerminal}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
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
          <Action
            title="Delete All Commands"
            onAction={props.onDeleteAll}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            style={Action.Style.Destructive}
          />
          <OpenDataFileFolderAction />
        </ActionPanel>
      }
    />
  );
}
