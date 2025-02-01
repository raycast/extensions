import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  getSelectedFinderItems,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { getProgressIcon } from "@raycast/utils";
import EditDestination from "./destination-form";
import { Destination, destinationRepo } from "./repo/destination";
import { checkFileExists, copyFile, getFilenameFromPath, moveFile } from "./utils/filesystem";

interface CopyMoveToProps {
  mode: "copy" | "move";
}

export default function CopyMoveTo(props: CopyMoveToProps) {
  const preferences = getPreferenceValues<Preferences>();
  const isMove = props.mode === "move";
  const actionText = isMove ? "move" : "copy";
  const actionTextPast = isMove ? "moved" : "copied";

  const [progress, setProgress] = useState<number>(0);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [activeDestination, setActiveDestination] = useState<Destination | null>(null);

  async function fetchDestinations() {
    try {
      const items = await LocalStorage.allItems<Destination[]>();
      const validDestinations: Destination[] = [];

      for (const destination of Object.values(items)) {
        if (typeof destination !== "string") {
          console.error("Invalid destination", destination);
          continue;
        }
        const parsedDestination = JSON.parse(destination);
        if (!isMove && parsedDestination.enableCopy) {
          validDestinations.push(parsedDestination);
        }
        if (isMove && parsedDestination.enableMove) {
          validDestinations.push(parsedDestination);
        }
      }

      setDestinations(
        [...validDestinations].sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return 0;
        }),
      );
    } catch (error) {
      console.error("Failed to load destinations", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load destinations",
      });
    }
  }
  useEffect(() => {
    fetchDestinations();
  }, []);

  async function handleAction(name: string) {
    try {
      const fileAction = isMove ? moveFile : copyFile;
      const destination = destinations.find((destination) => destination.name === name);
      if (!destination) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Destination not found",
        });
        return;
      }

      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files selected in Finder",
        });
        return;
      }

      let completed = 0;
      for (const item of selectedItems) {
        const filename = await getFilenameFromPath(item.path);
        const alreadyExists = await checkFileExists(item.path, destination.directory);
        if (alreadyExists) {
          switch (preferences.fileConflictAction) {
            case "overwrite":
              await fileAction(item.path, destination.directory);
              break;
            case "prompt": {
              const shouldOverwrite = await confirmAlert({
                title: "File Already Exists",
                message: `${filename} already exists in destination. Do you want to overwrite it?`,
                primaryAction: {
                  title: "Overwrite",
                  style: Alert.ActionStyle.Destructive,
                },
                dismissAction: {
                  title: "Skip",
                  style: Alert.ActionStyle.Cancel,
                },
              });
              if (shouldOverwrite) {
                await fileAction(item.path, destination.directory);
              }
              break;
            }
            case "skip":
              continue;
          }
        } else {
          await fileAction(item.path, destination.directory);
        }
        completed += 1;
        setProgress(completed / selectedItems.length);
      }
      setProgress(0);

      await showToast({
        style: Toast.Style.Success,
        title: `Files ${actionTextPast} successfully`,
      });

      switch (preferences.afterCompletionAction) {
        case "close":
          await popToRoot();
          await closeMainWindow();
          break;
        case "popToRoot":
          await popToRoot();
          break;
        case "nothing":
          break;
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${actionText} files`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const [isInEditMode, setIsInEditMode] = useState(false);
  function handleEdit(name: string) {
    const destination = destinations.find((destination) => destination.name === name) ?? null;
    setIsInEditMode(true);
    setActiveDestination(destination);
  }

  async function handleDelete(name: string) {
    const shouldDelete = await confirmAlert({
      title: "Delete Destination",
      message: `Are you sure you want to delete the destination "${name}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (shouldDelete) {
      await destinationRepo.deleteOne(name);
      await fetchDestinations();
    }
  }

  async function handlePin(name: string) {
    try {
      const destination = destinations.find((d) => d.name === name);
      if (!destination) return;
      const updatedDestination = {
        ...destination,
        pinned: !destination.pinned,
      };
      await destinationRepo.saveOne(updatedDestination);
      setDestinations((prevDestinations) =>
        prevDestinations
          .map((d) => (d.name === name ? updatedDestination : d))
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
          }),
      );
      await showToast({
        style: Toast.Style.Success,
        title: updatedDestination.pinned ? "Destination pinned" : "Destination unpinned",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to pin destination",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return !isInEditMode ? (
    <List searchBarPlaceholder="Search Destinations...">
      {destinations.length === 0 ? (
        <List.EmptyView title="No destinations!" />
      ) : (
        destinations.map((destination) => (
          <List.Item
            key={destination.name}
            title={destination.name}
            subtitle={preferences.showPath ? destination.directory : undefined}
            icon={progress > 0 ? getProgressIcon(progress) : undefined}
            accessories={[
              {
                icon: destination.pinned ? Icon.Star : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={isMove ? "Move Here" : "Copy Here"}
                  style={Action.Style.Regular}
                  icon={isMove ? Icon.ArrowRight : Icon.Duplicate}
                  onAction={() => handleAction(destination.name)}
                />
                <Action
                  title="Edit"
                  style={Action.Style.Regular}
                  icon={Icon.Pencil}
                  onAction={() => handleEdit(destination.name)}
                />
                <Action
                  title={destination.pinned ? "Remove from Favorites" : "Add to Favorites"}
                  icon={destination.pinned ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handlePin(destination.name)}
                />
                <Action
                  title="Delete"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(destination.name)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  ) : activeDestination ? (
    <EditDestination destination={activeDestination} />
  ) : null;
}
