import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { SyncFoldersForm } from "./components/SyncFoldersForm";
import { useSyncFolders } from "./hooks";
import { SyncFolders } from "./types";
import { lastSyncDate } from "./utils";

type SyncFoldersType = { id: string; name: string };

export default function Command() {
  const { syncFolders, deleteSyncFolders: deleteSyncFolder, runSyncFolders, isLoading, mutate } = useSyncFolders();

  const [dropDownFilter, setDropDownFilter] = useState<string>();

  /**
   * Executes the synchronization of folders based on the provided ID.
   *
   * @param {string | undefined} id - The identifier for the folder synchronization. If the ID is undefined, the function will return immediately.
   * @returns {Promise<void>} A promise that resolves when the folder synchronization is complete.
   */
  async function handleRunSyncFolders(id: string | undefined): Promise<void> {
    if (!id) {
      return;
    }

    if (
      await confirmAlert({
        title: "Sync Folders",
        message: "Are you sure you want to Sync Folders?",
        icon: { source: Icon.Warning, tintColor: Color.Red },
      })
    ) {
      await runSyncFolders(id as string);
    }
  }

  /**
   * Deletes a specified sync folders preset after user confirmation.
   *
   * @param {SyncFolders} sync_folders - The sync folders preset to be deleted.
   * @returns {Promise<void>} A promise that resolves when the folder is deleted.
   */
  async function handleDeleteSyncFolders(sync_folders: SyncFolders): Promise<void> {
    if (!sync_folders) {
      return;
    }

    if (
      await confirmAlert({
        title: "Delete Sync Folder",
        message: "Are you sure you want to delete this Sync Folder?",
        icon: { source: Icon.Warning, tintColor: Color.Red },
      })
    ) {
      deleteSyncFolder(sync_folders.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Deleted Reminder",
        message: sync_folders.name,
      });
    }
  }

  /**
   * SyncFoldersDropdown component renders a dropdown list for filtering sync folders.
   *
   * This component uses a dropdown from the List component to allow users to filter
   * sync folders based on predefined types. The available filter options are:
   * - "All": Show all folders.
   * - "Never Synchronize": Show folders that should never be synchronized.
   * - "Only Synchronize": Show folders that should only be synchronized.
   *
   * @returns {JSX.Element} The rendered dropdown component.
   */
  function SyncFoldersDropdown() {
    const drinkTypes: SyncFoldersType[] = [
      { id: "all", name: "All" },
      { id: "never_sync", name: "Never Synchronize" },
      { id: "only_sync", name: "Only Synchronize" },
    ];

    return (
      <List.Dropdown tooltip="Filter Sync Folders" storeValue={true} onChange={setDropDownFilter}>
        {drinkTypes.map((drinkType) => (
          <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
        ))}
      </List.Dropdown>
    );
  }

  return (
    <List
      isShowingDetail={!!syncFolders && syncFolders.length > 0}
      isLoading={isLoading}
      navigationTitle="My Sync Folders"
      searchBarPlaceholder="Search your favorite Sync Folders"
      searchBarAccessory={<SyncFoldersDropdown />}
    >
      {syncFolders
        ?.filter((sync_folders) => {
          if (!dropDownFilter || dropDownFilter === "all") {
            return true;
          }

          if (dropDownFilter === "never_sync") {
            return !sync_folders.last_sync;
          }

          if (dropDownFilter === "only_sync") {
            return sync_folders.last_sync;
          }

          return false;
        })
        ?.map((sync_folders) => {
          const { id, icon, name, source_folder, dest_folder, delete_dest, last_sync } = sync_folders;

          const accessories = [
            {
              tag: {
                value: last_sync || "Never",
                color: last_sync ? Color.Green : Color.Magenta,
              },
            },
          ];

          return (
            <List.Item
              key={id}
              icon={{
                source: icon ? Icon[icon as keyof typeof Icon] : Icon.Folder,
                tintColor: delete_dest ? Color.Orange : Color.Green,
              }}
              title={name as string}
              actions={
                <ActionPanel title="Start Sync">
                  <Action.SubmitForm
                    style={Action.Style.Regular}
                    title={`Sync ${name}`}
                    icon={Icon.Repeat}
                    onSubmit={() => handleRunSyncFolders(id)}
                  />
                  <Action.Push
                    title="Edit"
                    target={
                      <SyncFoldersForm
                        syncFolder={{
                          icon,
                          id,
                          name,
                          source_folder,
                          dest_folder,
                          delete_dest,
                        }}
                      />
                    }
                    onPop={mutate}
                    icon={Icon.Pencil}
                  />
                  <Action.Push
                    title="Duplicate"
                    target={<SyncFoldersForm syncFolder={{ ...sync_folders, id: undefined, name: `${name} Copy` }} />}
                    onPop={mutate}
                    icon={Icon.Duplicate}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create Sync Folders"
                      icon={Icon.Plus}
                      target={<SyncFoldersForm />}
                      onPop={mutate}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.ShowInFinder title="Show Source Folder" path={source_folder as string} />
                    <Action.ShowInFinder title="Show Destination Folder" path={dest_folder as string} />
                  </ActionPanel.Section>

                  <Action
                    title="Delete Sync Folders"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDeleteSyncFolders(sync_folders)}
                  />
                </ActionPanel>
              }
              accessories={accessories}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Source" text={source_folder} />
                      <List.Item.Detail.Metadata.Label title="Destination" text={dest_folder} />

                      <List.Item.Detail.Metadata.TagList title="Delete">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={delete_dest ? "Yes" : "No"}
                          color={delete_dest ? Color.Orange : Color.Green}
                        />
                      </List.Item.Detail.Metadata.TagList>

                      <List.Item.Detail.Metadata.TagList title="Last Sync">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={lastSyncDate(last_sync)}
                          color={last_sync ? Color.Green : Color.Magenta}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}

      <List.EmptyView
        title="No Sync Folders found"
        description="Create a new Sync Folders by pressing the ⏎ key."
        actions={
          <ActionPanel>
            <Action.Push title="Create Sync Folders" icon={Icon.Plus} target={<SyncFoldersForm />} onPop={mutate} />
          </ActionPanel>
        }
      />
    </List>
  );
}
