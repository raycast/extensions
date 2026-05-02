import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import type { ComponentProps } from "react";
import type { Destination } from "$lib/destination-groups";
import { buildCopyMoveDestinationGroups } from "$lib/destination-groups";
import type { Item } from "$lib/types";

const NO_DESTINATIONS_AVAILABLE_TITLE = "No Destinations Available";
const FAVORITES_SUBMENU_TITLE = "Favorites…";
const CURRENT_FOLDER_SUBMENU_TITLE = "Current Folder…";

type DestinationSubmenuProps = {
  mode: "copy" | "move";
  title?: string;
  sourcePath: string;
  sourceType: Item["type"];
  siblingDirectories: Item[];
  onSelect: (destinationPath: string) => Promise<void> | void;
  shortcut?: ComponentProps<typeof ActionPanel.Submenu>["shortcut"];
};

export function DestinationSubmenu({
  mode,
  title,
  sourcePath,
  sourceType,
  siblingDirectories,
  onSelect,
  shortcut,
}: DestinationSubmenuProps) {
  const destinationGroups = buildCopyMoveDestinationGroups({
    mode,
    sourcePath,
    sourceType,
    siblingDirectories,
  });
  const favorites = destinationGroups.find((group) => group.key === "favorites")?.destinations ?? [];
  const currentFolderDestinations =
    destinationGroups.find((group) => group.key === "current-folder")?.destinations ?? [];

  const hasDestinations = favorites.length > 0 || currentFolderDestinations.length > 0;
  const submenuTitle = title ?? (mode === "copy" ? "Copy to…" : "Move to…");
  const icon = mode === "copy" ? Icon.Duplicate : Icon.ArrowRightCircle;

  async function handleSelect(destinationPath: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: mode === "copy" ? "Copying…" : "Moving…",
    });

    try {
      await onSelect(destinationPath);
      toast.style = Toast.Style.Success;
      toast.title = mode === "copy" ? "Copied" : "Moved";
    } catch (error) {
      const destinationError = error as { message?: string } | undefined;
      toast.style = Toast.Style.Failure;
      toast.title = mode === "copy" ? "Failed to Copy Item" : "Failed to Move Item";
      toast.message = destinationError?.message;
      throw error;
    }
  }

  function renderDestinationActions(destinations: Destination[]) {
    return destinations.map((destination) => (
      <Action
        key={destination.path}
        title={destination.label}
        icon={Icon.Folder}
        onAction={() => handleSelect(destination.path)}
      />
    ));
  }

  function renderDestinationGroupSubmenu(title: string, icon: Icon, destinations: Destination[]) {
    if (destinations.length === 0) {
      return null;
    }

    return (
      <ActionPanel.Submenu key={title} title={title} icon={icon}>
        {renderDestinationActions(destinations)}
      </ActionPanel.Submenu>
    );
  }

  return (
    <ActionPanel.Submenu title={submenuTitle} icon={icon} shortcut={shortcut}>
      {!hasDestinations ? (
        <Action title={NO_DESTINATIONS_AVAILABLE_TITLE} />
      ) : (
        <ActionPanel.Section>
          {renderDestinationGroupSubmenu(FAVORITES_SUBMENU_TITLE, Icon.Star, favorites)}
          {renderDestinationGroupSubmenu(CURRENT_FOLDER_SUBMENU_TITLE, Icon.Folder, currentFolderDestinations)}
        </ActionPanel.Section>
      )}
    </ActionPanel.Submenu>
  );
}
