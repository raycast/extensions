import { List, ActionPanel, Action, Icon, Color, Toast, showToast, getApplications } from "@raycast/api";
import { Resolution } from "../types";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState, useEffect } from "react";

interface ResolutionListProps {
  resolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  sectionTitle?: string;
  showDeleteAction?: boolean;
  onDeleteResolution?: (resolution: Resolution) => Promise<void>;
  onToggleStar?: (resolution: Resolution) => Promise<void>;
  selectedItemId?: string | null | undefined;
  starredResolutions?: Resolution[];
}

interface ListAccessory {
  icon: {
    source: string;
    fallback: Icon;
    tintColor: Color;
  };
  tooltip: string;
}

// Icon paths that need to be preloaded
const ICON_PATHS = {
  customSize: "icons/custom-size.svg",
  defaultSize: "icons/default-size.svg",
  clear: "icons/clear.svg",
  unstar: "icons/unstar.svg",
  star: "icons/star.svg",
  starCheck: "icons/star-check.svg",
} as const;

/**
 * ResolutionList component displays a list of available resolutions
 */
export function ResolutionList({
  resolutions,
  onResizeWindow,
  sectionTitle = "Resolutions",
  showDeleteAction = false,
  onDeleteResolution,
  onToggleStar,
  selectedItemId,
  starredResolutions = [],
}: ResolutionListProps) {
  const [isIconsReady, setIsIconsReady] = useState(false);

  useEffect(() => {
    const preloadIcons = async () => {
      try {
        await getApplications();
        setIsIconsReady(true);
      } catch (error) {
        console.error("Failed to preload icons:", error);
        setIsIconsReady(true);
      }
    };

    preloadIcons();
  }, []);

  // Helper function to check if a resolution is starred
  const isStarred = (resolution: Resolution) =>
    starredResolutions.some((r) => r.width === resolution.width && r.height === resolution.height);

  // Pre-compute accessories for each resolution to ensure stable rendering
  const resolutionAccessories = useMemo(() => {
    return resolutions.reduce(
      (acc, resolution, index) => {
        const itemId = `${resolution.isCustom ? "custom" : "default"}-${resolution.width}x${resolution.height}-${sectionTitle}-${index}`;
        const isSelected = itemId === selectedItemId;
        const resolutionIsStarred = isStarred(resolution);

        let accessories: ListAccessory[] = [];
        if (isSelected) {
          if (showDeleteAction && resolution.isCustom) {
            accessories = [
              {
                icon: { source: ICON_PATHS.clear, fallback: Icon.Trash, tintColor: Color.SecondaryText },
                tooltip: "⌘ D",
              },
            ];
          } else if (resolutionIsStarred) {
            accessories = [
              {
                icon: {
                  source: ICON_PATHS.unstar,
                  fallback: Icon.StarDisabled,
                  tintColor: Color.SecondaryText,
                },
                tooltip: "⇧ ⌘ S",
              },
            ];
          } else if (!resolution.isCustom) {
            accessories = [
              {
                icon: { source: ICON_PATHS.star, fallback: Icon.Star, tintColor: Color.SecondaryText },
                tooltip: "⌘ S",
              },
            ];
          }
        }

        acc[itemId] = accessories;
        return acc;
      },
      {} as Record<string, ListAccessory[]>,
    );
  }, [resolutions, selectedItemId, showDeleteAction, starredResolutions, sectionTitle]);

  // Pre-compute list items to ensure stable rendering
  const listItems = useMemo(() => {
    return resolutions.map((resolution, index) => {
      const itemId = `${resolution.isCustom ? "custom" : "default"}-${resolution.width}x${resolution.height}-${sectionTitle}-${index}`;
      const resolutionIsStarred = isStarred(resolution);

      return (
        <List.Item
          key={itemId}
          id={itemId}
          title={resolution.title}
          icon={{
            source: resolution.isCustom ? ICON_PATHS.customSize : ICON_PATHS.defaultSize,
            fallback: Icon.AppWindow,
            tintColor: Color.SecondaryText,
          }}
          accessories={resolutionAccessories[itemId] || []}
          actions={
            isIconsReady ? (
              <ActionPanel>
                <Action
                  title={`Resize to ${resolution.title}`}
                  icon={{
                    source: resolution.isCustom ? ICON_PATHS.customSize : ICON_PATHS.defaultSize,
                    fallback: Icon.AppWindow,
                    tintColor: Color.PrimaryText,
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={async () => {
                    try {
                      await onResizeWindow(resolution.width, resolution.height);
                    } catch (error) {
                      await showFailureToast("Failed to resize window", {
                        message: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }}
                />
                {resolutionIsStarred ? (
                  <>
                    <Action
                      title="Remove from Starred"
                      icon={{
                        source: ICON_PATHS.unstar,
                        fallback: Icon.StarDisabled,
                        tintColor: Color.PrimaryText,
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      onAction={async () => {
                        if (!onToggleStar) {
                          return;
                        }
                        try {
                          await onToggleStar(resolution);
                        } catch (error) {
                          await showFailureToast("Failed to remove from starred", {
                            message: error instanceof Error ? error.message : String(error),
                          });
                        }
                      }}
                    />
                    {sectionTitle !== "Starred Sizes" && (
                      <Action
                        title="Already Starred"
                        icon={{
                          source: ICON_PATHS.starCheck,
                          fallback: Icon.Star,
                          tintColor: Color.PrimaryText,
                        }}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={async () => {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Already Starred",
                          });
                        }}
                      />
                    )}
                  </>
                ) : (
                  <Action
                    title="Mark as Starred"
                    icon={{
                      source: ICON_PATHS.star,
                      fallback: Icon.Star,
                      tintColor: Color.PrimaryText,
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={async () => {
                      if (!onToggleStar) {
                        return;
                      }
                      try {
                        await onToggleStar(resolution);
                      } catch (error) {
                        await showFailureToast("Failed to mark as starred", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }}
                  />
                )}
                {showDeleteAction && resolution.isCustom && (
                  <Action
                    title="Delete Custom Size"
                    style={Action.Style.Destructive}
                    icon={{
                      source: ICON_PATHS.clear,
                      fallback: Icon.Trash,
                      tintColor: Color.Red,
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      if (!onDeleteResolution) {
                        return;
                      }
                      try {
                        await onDeleteResolution(resolution);
                        if (resolutionIsStarred && onToggleStar) {
                          await onToggleStar(resolution);
                        }
                      } catch (error) {
                        await showFailureToast("Failed to delete custom size", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                        return;
                      }
                    }}
                  />
                )}
              </ActionPanel>
            ) : null
          }
        />
      );
    });
  }, [
    resolutions,
    resolutionAccessories,
    sectionTitle,
    onResizeWindow,
    onToggleStar,
    onDeleteResolution,
    showDeleteAction,
    isIconsReady,
  ]);

  return <List.Section title={sectionTitle}>{listItems}</List.Section>;
}
