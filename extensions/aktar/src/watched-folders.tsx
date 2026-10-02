import { Action, ActionPanel, Color, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  isConnectionError,
  isWatchedFoldersUnsupported,
  listDestinations,
  listWatchedFolders,
  pauseWatching,
  resumeWatching,
  setWatchedFolderEnabled,
} from "./api/client";
import type { Destination, WatchedFolder, WatchedFolders } from "./api/types";
import { ConnectionEmptyView } from "./components/ConnectionEmptyView";
import { AKTAR_DOWNLOAD_URL, showAktarFailure } from "./lib/errors";
import {
  describeWatching,
  minutesUntilTomorrow,
  STATUS_TAGS,
  UPDATE_FOR_WATCHED_FOLDERS,
  WATCHED_FOLDERS_SETTINGS_URL,
} from "./lib/watching";

export default function Command() {
  const { data: destinations } = useCachedPromise(listDestinations, []);
  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(listWatchedFolders, [], {
    onError: (error) => {
      if (!isConnectionError(error) && !isWatchedFoldersUnsupported(error)) {
        showAktarFailure(error, "Couldn't load your watched folders");
      }
    },
  });

  const folders = error ? [] : (data?.folders ?? []);

  async function pause(minutes: number | undefined, label: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Pausing watching" });
    try {
      await mutate(pauseWatching(minutes), { shouldRevalidateAfter: false });
      toast.style = Toast.Style.Success;
      toast.title = `Watching paused ${label}`;
    } catch (error) {
      await showAktarFailure(error, "Couldn't pause watching");
    }
  }

  async function resume() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Resuming watching" });
    try {
      await mutate(resumeWatching(), { shouldRevalidateAfter: false });
      toast.style = Toast.Style.Success;
      toast.title = "Watching resumed";
    } catch (error) {
      await showAktarFailure(error, "Couldn't resume watching");
    }
  }

  async function setEnabled(folder: WatchedFolder, enabled: boolean) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${enabled ? "Enabling" : "Disabling"} ${folder.name}`,
    });
    try {
      await mutate(setWatchedFolderEnabled(folder.id, enabled), {
        optimisticUpdate: (current) => replaceFolder(current, { ...folder, enabled }),
      });
      toast.style = Toast.Style.Success;
      toast.title = `${enabled ? "Enabled" : "Disabled"} ${folder.name}`;
    } catch (error) {
      await showAktarFailure(error, `Couldn't ${enabled ? "enable" : "disable"} the folder`);
    }
  }

  function watchingActions() {
    if (!data) return null;
    return data.paused ? (
      <Action
        title="Resume Watching"
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={resume}
      />
    ) : (
      <ActionPanel.Submenu
        title="Pause Watching"
        icon={Icon.Pause}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      >
        <Action title="For 1 Hour" icon={Icon.Clock} onAction={() => pause(60, "for 1 hour")} />
        <Action
          title="Until Tomorrow"
          icon={Icon.Moon}
          onAction={() => pause(minutesUntilTomorrow(), "until tomorrow")}
        />
        <Action title="Until I Resume" icon={Icon.Pause} onAction={() => pause(undefined, "until you resume it")} />
      </ActionPanel.Submenu>
    );
  }

  const openSettingsAction = (
    <Action
      title="Open Watched Folders Settings"
      icon={Icon.Gear}
      shortcut={Keyboard.Shortcut.Common.OpenWith}
      onAction={() => open(WATCHED_FOLDERS_SETTINGS_URL)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search watched folders">
      {error && isConnectionError(error) ? (
        <ConnectionEmptyView error={error} onRetry={revalidate} />
      ) : error && isWatchedFoldersUnsupported(error) ? (
        <List.EmptyView
          icon={Icon.Download}
          title="Update Aktar to Use Watched Folders"
          description={`${UPDATE_FOR_WATCHED_FOLDERS}: they upload files the moment they land in a folder.`}
          actions={
            <ActionPanel>
              <Action title="Download Aktar" icon={Icon.Download} onAction={() => open(AKTAR_DOWNLOAD_URL)} />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Eye}
          title={isLoading ? "Loading…" : "No Watched Folders"}
          description={
            isLoading
              ? undefined
              : "Upload files the moment they land in a folder. Add one in Aktar's Watched Folders settings."
          }
          actions={
            <ActionPanel>
              {openSettingsAction}
              {watchingActions()}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}
      {data && folders.length > 0 && (
        <List.Section title={describeWatching(data, folders.filter((folder) => folder.enabled).length)}>
          {folders.map((folder) => (
            <List.Item
              key={folder.id}
              icon={{ fileIcon: folder.path }}
              title={folder.name}
              subtitle={folder.path}
              keywords={[folder.path]}
              accessories={folderAccessories(folder, destinations)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={folder.enabled ? "Disable Folder" : "Enable Folder"}
                      icon={folder.enabled ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => setEnabled(folder, !folder.enabled)}
                    />
                    {watchingActions()}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.ShowInFinder path={folder.path} shortcut={Keyboard.Shortcut.Common.Open} />
                    {openSettingsAction}
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={folder.path}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function replaceFolder(current: WatchedFolders | undefined, folder: WatchedFolder): WatchedFolders | undefined {
  if (!current) return current;
  return {
    ...current,
    folders: current.folders.map((candidate) => (candidate.id === folder.id ? folder : candidate)),
  };
}

function folderAccessories(folder: WatchedFolder, destinations: Destination[] | undefined): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (folder.awaitingConfirmation > 0) {
    accessories.push({
      tag: { value: `${folder.awaitingConfirmation} to confirm`, color: Color.Purple },
      tooltip: `${folder.awaitingConfirmation} new files wait for you to choose Upload or Skip in Aktar`,
    });
  }
  if (folder.failed > 0) {
    accessories.push({
      tag: { value: `${folder.failed} failed`, color: Color.Red },
      tooltip: "Retry them from Aktar",
    });
  }
  if (folder.uploading > 0) {
    accessories.push({ icon: Icon.Upload, text: `${folder.uploading}`, tooltip: `Uploading ${folder.uploading}` });
  }
  if (folder.waiting > 0) {
    accessories.push({
      icon: Icon.Hourglass,
      text: `${folder.waiting}`,
      tooltip: `Waiting for ${folder.waiting} ${folder.waiting === 1 ? "file" : "files"} to finish writing`,
    });
  }
  const destination = destinationName(folder, destinations);
  if (destination) accessories.push({ icon: Icon.HardDrive, text: destination, tooltip: "Destination" });
  if (folder.lastUploadAt) {
    const date = new Date(folder.lastUploadAt);
    accessories.push({ date, tooltip: `Last upload: ${date.toLocaleString()}` });
  }
  const status = STATUS_TAGS[folder.status] ?? { title: folder.status, color: Color.SecondaryText };
  accessories.push({ tag: { value: status.title, color: status.color } });
  return accessories;
}

function destinationName(folder: WatchedFolder, destinations: Destination[] | undefined) {
  if (!destinations) return undefined;
  if (folder.destinationID) {
    return destinations.find((destination) => destination.id === folder.destinationID)?.name;
  }
  const fallback = destinations.find((destination) => destination.isDefault);
  return fallback ? `${fallback.name} (Default)` : undefined;
}
