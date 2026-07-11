import {
  Detail,
  ActionPanel,
  Action,
  popToRoot,
  List,
  Color,
  Icon,
  useNavigation,
  Form,
  confirmAlert,
  showInFinder,
  showHUD,
  Alert,
} from "@raycast/api";
import { BackupSystemHostName, HostFolderMode, HostInactiveByFolderTip, State, SystemHostFilePath } from "./const";
import { exportHost, getContentFromFile, getContentFromUrl, getSysHostAccess } from "./utils/file";
import { Fragment, useState } from "react";
import { Action$ } from "raycast-toolkit";
import path from "node:path";

export function SysHostPermRequest() {
  const md = `
  # Hey!👋 Welcome to use iHosts 🎉🎉🎉 \n
  You're one step away from using it! Please type ↩️ and allow iHosts to write to the **${SystemHostFilePath}** file~\n
  ![](sys-host-prem.png)
  `;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Get Write Permission"
            icon={{ source: Icon.Fingerprint, tintColor: Color.Red }}
            onAction={async () => {
              try {
                await getSysHostAccess();
                await showHUD("Write Permission got");
                await popToRoot();
              } catch (error) {
                await showHUD("Failed to get Write Permission");
              }
            }}
          ></Action>
        </ActionPanel>
      }
    ></Detail>
  );
}

export function FolderFilterDropDown(props: { folders: IHostCommon[]; onFolderChange: (selected: string) => void }) {
  return (
    <List.Dropdown
      tooltip="Select Folder"
      storeValue={true}
      onChange={(selected) => {
        props.onFolderChange(selected);
      }}
    >
      <List.Dropdown.Section>
        <List.Dropdown.Item title="All Hosts" value={"-1"} />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {props.folders.map((folder) => (
          <List.Dropdown.Item key={folder.id} title={folder.name} value={folder.id} icon={getItemIcon(folder)} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export function getItemIcon(item: IHostCommon, menu?: boolean) {
  if (!item.isFolder) {
    if (item.state == State.Disable) {
      return {
        source: Icon.Circle,
        tintColor: item.folderState === State.Disable ? Color.SecondaryText : Color.Green,
      };
    } else {
      return {
        source: Icon.CheckCircle,
        tintColor: item.folderState === State.Disable ? Color.SecondaryText : Color.Green,
      };
    }
  }
  if (item.isFolder) {
    if (menu) {
      if (item.state == State.Disable) {
        return {
          source: Icon.Circle,
          tintColor: Color.Blue,
        };
      } else {
        return {
          source: Icon.CheckCircle,
          tintColor: Color.Blue,
        };
      }
    } else {
      if (item.state == State.Disable) {
        return {
          source: Icon.Folder,
          tintColor: Color.SecondaryText,
        };
      } else {
        return {
          source: Icon.Folder,
          tintColor: Color.Blue,
        };
      }
    }
  }
}

export function getItemAccessories(item: IHostCommon) {
  const accessories = [];
  if (!item.isFolder) {
    if (item.folderState == State.Disable && item.state == State.Enable) {
      accessories.push({
        icon: { source: Icon.Info, tintColor: Color.SecondaryText },
        tooltip: HostInactiveByFolderTip,
      });
    }
  }
  accessories.push({ date: new Date(item.ctime) });
  return accessories;
}

export function getItemActions(
  item: IHostCommon,
  newFolder: (folder: INewFolder) => void,
  allFolders: IHostCommon[],
  upsertHost: (host: IUpsertHost) => void,
  toggleItemState: (id: string) => void,
  deleteItem: (id: string) => void
) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {item.name !== BackupSystemHostName && (
          <Action
            title="Toggle State"
            icon={Icon.Repeat}
            shortcut={{ modifiers: [], key: "enter" }}
            onAction={() => toggleItemState(item.id)}
          ></Action>
        )}
        <Action.Push
          title="New Host"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<UpsertHost folders={allFolders} upsertHost={upsertHost} />}
        ></Action.Push>
        {item.name !== BackupSystemHostName && (
          <Action.Push
            title="Edit Host"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<UpsertHost folders={allFolders} upsertHost={upsertHost} isEdit={true} host={item} />}
          ></Action.Push>
        )}
        <Action
          title="Export Host"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={async () => {
            await showInFinder(exportHost(item));
            showHUD("Host exported");
          }}
        ></Action>
        <Action
          title="Delete"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
          onAction={async () => {
            if (
              await confirmAlert({
                icon: Icon.Trash,
                title: "Delete the host?",
                message: "You will not be able to recover it",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              })
            )
              deleteItem(item.id);
          }}
          style={Action.Style.Destructive}
        ></Action>
      </ActionPanel.Section>
      <MngFolderActions
        allFolders={allFolders}
        newFolder={newFolder}
        toggleFolderState={toggleItemState}
        deleteFolder={deleteItem}
      />
    </ActionPanel>
  );
}

export function SystemHostsActions(
  newFolder: (folder: INewFolder) => void,
  allFolders: IHostCommon[],
  upsertHost: (host: IUpsertHost) => void,
  toggleItemState: (id: string) => void,
  deleteItem: (id: string) => void
) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenWith path={"/etc/hosts"} />
        <Action.Push
          title="New Host"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<UpsertHost folders={allFolders} upsertHost={upsertHost} />}
        ></Action.Push>
      </ActionPanel.Section>
      <MngFolderActions
        allFolders={allFolders}
        newFolder={newFolder}
        toggleFolderState={toggleItemState}
        deleteFolder={deleteItem}
      />
    </ActionPanel>
  );
}

function MngFolderActions(props: {
  newFolder: (folder: INewFolder) => void;
  allFolders: IHostCommon[];
  toggleFolderState: (id: string) => void;
  deleteFolder: (id: string) => void;
}) {
  return (
    <ActionPanel.Section>
      <Action.Push
        title="New Folder"
        icon={Icon.NewFolder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<NewFolder newFolder={props.newFolder} />}
      ></Action.Push>
      <ActionPanel.Submenu
        title="Toggle Folder State"
        icon={Icon.Repeat}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      >
        {props.allFolders.map((folder) => {
          return (
            <Action
              key={folder.id}
              title={folder.name}
              icon={getItemIcon(folder, true)}
              onAction={() => props.toggleFolderState(folder.id)}
            ></Action>
          );
        })}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        title="Delete Folder"
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
      >
        {props.allFolders.map((folder) => {
          return (
            <Action
              key={folder.id}
              title={folder.name}
              icon={getItemIcon(folder)}
              onAction={async () => {
                if (
                  await confirmAlert({
                    icon: Icon.Trash,
                    title: "Delete the Folder?",
                    message: "The hosts in the folder will also be deleted and you will not be able to recover it",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  })
                )
                  props.deleteFolder(folder.id);
              }}
            ></Action>
          );
        })}
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );
}

function NewFolder(props: { newFolder: (folder: INewFolder) => void }) {
  const [nameError, updateNameErrorState] = useState<string | undefined>();
  const { pop } = useNavigation();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      updateNameErrorState(undefined);
    }
  }

  function validName(name?: string): boolean {
    if (!name) {
      updateNameErrorState("The name should't be empty");
      return false;
    }
    return true;
  }

  async function submit(folder: INewFolder) {
    if (!validName(folder.name)) {
      return;
    }
    props.newFolder(folder);
    pop();
  }

  return (
    <Form
      navigationTitle="New Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="New Folder" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        autoFocus
        placeholder="Enter folder name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
      />
      <Form.Dropdown id="mode" title="Mode" defaultValue={HostFolderMode.Multiple}>
        <Form.Dropdown.Item value={HostFolderMode.Multiple} title="Multiple" icon={Icon.Ellipsis}></Form.Dropdown.Item>
        <Form.Dropdown.Item value={HostFolderMode.Single} title="Single" icon={Icon.Dot}></Form.Dropdown.Item>
      </Form.Dropdown>
    </Form>
  );
}

function UpsertHost(props: {
  folders: IHostCommon[];
  isEdit?: boolean;
  host?: IHostCommon;
  upsertHost: (host: IUpsertHost) => void;
}) {
  const [name, updateNameState] = useState<string>(props.host?.name || "");
  const [folder, updateFolderState] = useState<string>("");
  const [content, updateContentState] = useState<string>(props.host?.content || "");
  const [nameError, updateNameErrorState] = useState<string | undefined>();
  const [isRemote, updateIsRemoteState] = useState<boolean>(props.host?.isRemote ? true : false);
  const [urlInput, updateUrlInputState] = useState<string>(props.host?.url || "");
  const [fetchError, updateFetchErrorState] = useState<string | undefined>();
  const { pop } = useNavigation();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      updateNameErrorState(undefined);
    }
  }

  function dropFetchErrorIfNeeded() {
    if (fetchError && fetchError.length > 0) {
      updateFetchErrorState(undefined);
    }
  }

  function validName(): boolean {
    if (!name) {
      updateNameErrorState("The name should't be empty");
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validName()) {
      return;
    }

    props.upsertHost({
      id: props.host?.id,
      name,
      folder,
      // TODO: fix
      // isRemote
      content: content.trim(),
      url: urlInput,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={props.isEdit ? "Edit Host" : "New Host"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.isEdit ? "Update Host" : "Create Host"}
            icon={props.isEdit ? Icon.SaveDocument : Icon.NewDocument}
            onSubmit={submit}
          />
          <Action$.SelectFile
            title="Import from File"
            icon={Icon.ArrowRight}
            onSelect={(fullPath) => {
              if (!fullPath) return;
              const baseName = path.basename(fullPath);
              updateNameState(
                baseName.substring(0, baseName.lastIndexOf(".") < 0 ? baseName.length : baseName.lastIndexOf("."))
              );
              updateContentState(getContentFromFile(fullPath));
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        autoFocus
        placeholder="Enter host name"
        error={nameError}
        onChange={(value) => {
          updateNameState(value);
          dropNameErrorIfNeeded();
        }}
      />
      <Form.Checkbox
        id="remote"
        label="remote"
        title="Remote"
        value={isRemote}
        onChange={(value) => {
          updateIsRemoteState(value);
        }}
      ></Form.Checkbox>

      {isRemote && (
        <>
          <Form.TextField
            id="hosts_url"
            title="URL"
            value={urlInput}
            placeholder="Enter host URL"
            error={fetchError}
            onChange={(value) => {
              updateUrlInputState(value);
              dropFetchErrorIfNeeded();
            }}
          />
          <Form.Description text="Enter the URL to fetch host content" />
        </>
      )}
      {!props.isEdit && (
        <Form.Dropdown id="folder" title="Folder" value={folder} onChange={updateFolderState}>
          <Form.Dropdown.Section>
            <Form.Dropdown.Item value={"-1"} title="None"></Form.Dropdown.Item>
          </Form.Dropdown.Section>
          <Form.Dropdown.Section>
            {props.folders.map((folder) => {
              return (
                <Form.Dropdown.Item
                  key={folder.id}
                  value={folder.id}
                  title={folder.name}
                  icon={getItemIcon(folder)}
                ></Form.Dropdown.Item>
              );
            })}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}
      <Form.TextArea
        id="content"
        title="Content"
        value={content}
        placeholder="Enter host content"
        onChange={updateContentState}
      />
    </Form>
  );
}
