import { ActionPanel, Action, List, Icon, confirmAlert, Color, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { File } from "../api/getFiles";
import { updateFile } from "../api/updateFile";
import { getErrorMessage } from "../helpers/errors";
import { getFileIconLink, humanFileSize } from "../helpers/files";

type FileListItemProps = {
  mutate: MutatePromise<{ files: File[] } | undefined>;
  file: File;
};

export default function FileListItem({ file, mutate }: FileListItemProps) {
  const modifiedTime = new Date(file.modifiedTime);

  async function addToFavorites() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding to favorites" });

      await mutate(updateFile(file.id, { starred: true }), {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return { files: data.files.map((f) => (f.id === file.id ? { ...f, starred: true } : f)) };
        },
        rollbackOnError(data) {
          if (!data) {
            return data;
          }

          return { files: data.files.map((f) => (f.id === file.id ? { ...f, starred: false } : f)) };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Added to favorites",
        message: `"${file.name}" added to favorites`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add file to favorites",
        message: getErrorMessage(error),
      });
    }
  }

  async function removeFromFavorites() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Removing from favorites" });

      await mutate(updateFile(file.id, { starred: false }), {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return { files: data.files.map((f) => (f.id === file.id ? { ...f, starred: false } : f)) };
        },
        rollbackOnError(data) {
          if (!data) {
            return data;
          }

          return { files: data.files.map((f) => (f.id === file.id ? { ...f, starred: true } : f)) };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Removed from favorites",
        message: `"${file.name}" removed from favorites`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove file from favorites",
        message: getErrorMessage(error),
      });
    }
  }

  async function moveToTrash() {
    if (
      await confirmAlert({
        title: `Move File to Trash`,
        message: `Are you sure you want to move "${file.name}" to trash?`,
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Moving file to trash" });

        await mutate(updateFile(file.id, { trashed: true }), {
          optimisticUpdate(data) {
            if (!data) {
              return;
            }

            return { files: data.files.filter((f) => f.id !== file.id) };
          },
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Moved file to trash",
          message: `"${file.name}" moved to trash`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to move file to trash",
          message: getErrorMessage(error),
        });
      }
    }
  }

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(modifiedTime),
      tooltip: `Updated: ${format(modifiedTime, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
  ];

  if (file.starred) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Starred",
    });
  }

  return (
    <List.Item
      key={file.id}
      title={file.name}
      icon={{ source: getFileIconLink(file.mimeType), fallback: "google-drive.png" }}
      {...(file.size ? { subtitle: humanFileSize(parseInt(file.size)) } : {})}
      accessories={accessories}
      actions={
        <ActionPanel title={file.name}>
          <Action.OpenInBrowser title="Open in Browser" url={file.webViewLink} />

          {file.parents && file.parents.length > 0 ? (
            <Action.OpenInBrowser
              title="Open File Location in Browser"
              icon={Icon.Folder}
              // As of September 2020, a file can have exactly one parent folder
              // It's safe to assume the corresponding folder will be the first one
              // https://developers.google.com/drive/api/guides/ref-single-parent
              url={`https://drive.google.com/drive/folders/${file.parents[0]}`}
            />
          ) : null}

          {file.webContentLink ? (
            <Action.OpenInBrowser
              title="Download in Browser"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              url={file.webContentLink}
            />
          ) : null}
          {/*
            {file.starred ? (
              <Action
                title="Remove from Favorites"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={removeFromFavorites}
              />
            ) : (
              <Action
                title="Add to Favorites"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={addToFavorites}
              />
            )}

            {file.capabilities?.canTrash ? (
              <Action
                title="Move File to Trash"
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={moveToTrash}
              />
            ) : null} */}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={file.name}
              title="Copy File Name"
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />

            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={file.webViewLink}
              title="Copy File URL"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
