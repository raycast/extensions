import { List, ActionPanel, Action, Icon, Color, Toast, showToast, getApplications, Keyboard } from "@raycast/api";
import { Resolution } from "../types";
import { getResolutionSearchKeywords } from "../utils/resolution";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

interface ResolutionListProps {
  resolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  sectionTitle?: string;
  showDeleteAction?: boolean;
  onDeleteResolution?: (resolution: Resolution) => Promise<void>;
  onEditResolution?: (resolution: Resolution) => void;
  onToggleStar?: (resolution: Resolution) => Promise<void>;
  starredResolutions?: Resolution[];
  searchText: string;
  selectedItemId?: string;
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
  editSize: "icons/edit-size.svg",
  presetSize: "icons/preset-size.svg",
  clear: "icons/clear.svg",
  unstar: "icons/unstar.svg",
  star: "icons/star.svg",
  starCheck: "icons/star-check.svg",
  resizeTo: "icons/resize-to.svg",
} as const;

// Common.Duplicate resolves to Cmd+D at runtime, not the required unstar shortcut.
const REMOVE_STAR_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };

/**
 * ResolutionList component displays a list of available resolutions
 */
export function ResolutionList({
  resolutions,
  onResizeWindow,
  sectionTitle = "Resolutions",
  showDeleteAction = false,
  onDeleteResolution,
  onEditResolution,
  onToggleStar,
  starredResolutions = [],
  searchText,
  selectedItemId,
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

  return (
    <List.Section title={sectionTitle}>
      {resolutions.map((resolution, index) => {
        const itemId = `${resolution.isCustom ? "custom" : "default"}-${resolution.width}x${resolution.height}-${sectionTitle}-${index}`;
        const isSelected = itemId === selectedItemId;
        const resolutionIsStarred = isStarred(resolution);
        const accessories: ListAccessory[] = isSelected
          ? [
              {
                icon: {
                  source: resolutionIsStarred ? ICON_PATHS.unstar : ICON_PATHS.star,
                  fallback: resolutionIsStarred ? Icon.StarDisabled : Icon.Star,
                  tintColor: Color.SecondaryText,
                },
                tooltip: resolutionIsStarred ? "⇧ ⌘ S" : "⌘ S",
              },
            ]
          : [];

        return (
          <List.Item
            key={itemId}
            id={itemId}
            title={resolution.title}
            keywords={getResolutionSearchKeywords(resolution, searchText)}
            icon={{
              source: resolution.isCustom ? ICON_PATHS.customSize : ICON_PATHS.presetSize,
              fallback: Icon.AppWindow,
              tintColor: Color.SecondaryText,
            }}
            accessories={accessories}
            actions={
              isIconsReady ? (
                <ActionPanel>
                  <Action
                    title={`Resize to ${resolution.title}`}
                    icon={{
                      source: ICON_PATHS.resizeTo,
                      fallback: Icon.AppWindow,
                      tintColor: Color.PrimaryText,
                    }}
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
                  {resolution.isCustom && onEditResolution ? (
                    <Action
                      title="Edit Custom Size"
                      icon={{
                        source: ICON_PATHS.editSize,
                        fallback: Icon.Pencil,
                        tintColor: Color.PrimaryText,
                      }}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={() => onEditResolution(resolution)}
                    />
                  ) : null}
                  {resolutionIsStarred ? (
                    <>
                      <Action
                        title="Remove from Starred"
                        icon={{
                          source: ICON_PATHS.unstar,
                          fallback: Icon.StarDisabled,
                          tintColor: Color.PrimaryText,
                        }}
                        shortcut={REMOVE_STAR_SHORTCUT}
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
                      {sectionTitle !== "Starred Sizes" ? (
                        <Action
                          title="Already Starred"
                          icon={{
                            source: ICON_PATHS.starCheck,
                            fallback: Icon.Star,
                            tintColor: Color.PrimaryText,
                          }}
                          shortcut={Keyboard.Shortcut.Common.Save}
                          onAction={async () => {
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Already Starred",
                            });
                          }}
                        />
                      ) : null}
                    </>
                  ) : (
                    <Action
                      title="Mark as Starred"
                      icon={{
                        source: ICON_PATHS.star,
                        fallback: Icon.Star,
                        tintColor: Color.PrimaryText,
                      }}
                      shortcut={Keyboard.Shortcut.Common.Save}
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
                      shortcut={{ modifiers: ["cmd"], key: "x" }}
                      onAction={async () => {
                        if (!onDeleteResolution) {
                          return;
                        }
                        try {
                          await onDeleteResolution(resolution);
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
      })}
    </List.Section>
  );
}
