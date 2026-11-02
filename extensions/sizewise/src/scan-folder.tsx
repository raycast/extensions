import { Action, ActionPanel, Color, Icon, Keyboard, launchCommand, LaunchProps, LaunchType, List } from "@raycast/api";
import { getProgressIcon, showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import type { LargestFilesContext } from "./largest-files";
import { expandPath } from "./paths";
import { places } from "./places";
import { isScannable, mountedVolumes, scanOrShowFailure } from "./sizewise";
import { availableSpaceSummary, usedFraction } from "./volumes";

export default function Command(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  // Shows the disks from the last run at once, then refreshes their available space.
  const { data: volumes, isLoading } = useCachedPromise(mountedVolumes, [], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Couldn't list disks", message: "Try again, or enter a folder's path." });
    },
  });
  const typedPath = expandPath(searchText);
  const { data: typedFolder } = usePromise(
    async (path: string | undefined) => (path !== undefined && (await isScannable(path)) ? path : undefined),
    [typedPath],
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search disks and folders, or enter a path"
    >
      {/* A disk or folder listed below moves up here when its path is typed, so it's listed once. */}
      {typedFolder !== undefined && (
        <List.Section title="Path">
          <FolderItem
            title={typedFolder}
            path={typedFolder}
            // Always matches the search text it came from, which the built-in filter would hide.
            keywords={[searchText]}
          />
        </List.Section>
      )}
      <List.Section title="Disks">
        {volumes
          ?.filter((volume) => volume.path !== typedFolder)
          .map((volume) => {
            const fraction = usedFraction(volume);
            return (
              <FolderItem
                key={volume.path}
                title={volume.name}
                path={volume.path}
                keywords={["disk", "volume"]}
                accessories={[
                  {
                    text: availableSpaceSummary(volume),
                    icon: fraction === undefined ? undefined : getProgressIcon(fraction, Color.SecondaryText),
                  },
                ]}
              />
            );
          })}
      </List.Section>
      <List.Section title="Folders">
        {places()
          .filter((place) => place.path !== typedFolder)
          .map((place) => (
            <FolderItem key={place.path} title={place.title} path={place.path} />
          ))}
      </List.Section>
      <List.EmptyView
        icon={Icon.Folder}
        title={typedPath === undefined ? "No Matching Disk or Folder" : "No Folder at This Path"}
        description="Enter a folder's path, such as ~/Projects or /Volumes/Backup."
      />
    </List>
  );
}

function FolderItem(props: { title: string; path: string; keywords?: string[]; accessories?: List.Item.Accessory[] }) {
  return (
    <List.Item
      title={props.title}
      icon={{ fileIcon: props.path }}
      keywords={props.keywords}
      accessories={props.accessories}
      actions={
        <ActionPanel>
          <Action
            title="Scan with Sizewise"
            icon={Icon.MagnifyingGlass}
            onAction={() => scanOrShowFailure(props.path)}
          />
          <Action
            title="Show Largest Files"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => showLargestFiles(props.path)}
          />
          <Action.ShowInFinder path={props.path} />
          <Action.CopyToClipboard title="Copy Path" content={props.path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        </ActionPanel>
      }
    />
  );
}

async function showLargestFiles(folder: string) {
  const context: LargestFilesContext = { folder };
  try {
    await launchCommand({ name: "largest-files", type: LaunchType.UserInitiated, context });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Largest Files" });
  }
}
