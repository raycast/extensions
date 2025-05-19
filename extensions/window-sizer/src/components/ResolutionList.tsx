import { List, ActionPanel, Action, Icon, Color, Toast, showToast } from "@raycast/api";
import { Resolution } from "../types";
import { showFailureToast } from "@raycast/utils";

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
  // Helper function to check if a resolution is starred
  const isStarred = (resolution: Resolution) =>
    starredResolutions.some((r) => r.width === resolution.width && r.height === resolution.height);

  return (
    <List.Section title={sectionTitle}>
      {resolutions.map((resolution, index) => {
        const itemId = `${resolution.isCustom ? "custom" : "default"}-${resolution.width}x${resolution.height}-${sectionTitle}-${index}`;
        const isSelected = itemId === selectedItemId;
        const resolutionIsStarred = isStarred(resolution);

        return (
          <List.Item
            key={itemId}
            id={itemId}
            title={resolution.title}
            icon={{
              source: resolution.isCustom ? "icons/custom-size.svg" : "icons/default-size.svg",
              fallback: Icon.AppWindow,
              tintColor: Color.SecondaryText,
            }}
            accessories={
              (isSelected &&
                (showDeleteAction && resolution.isCustom === true
                  ? [
                      {
                        icon: { source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.SecondaryText },
                        tooltip: "⌘ D",
                      },
                    ]
                  : resolutionIsStarred
                    ? [
                        {
                          icon: {
                            source: "icons/unstar.svg",
                            fallback: Icon.StarDisabled,
                            tintColor: Color.SecondaryText,
                          },
                          tooltip: "⇧ ⌘ S",
                        },
                      ]
                    : !resolution.isCustom
                      ? [
                          {
                            icon: { source: "icons/star.svg", fallback: Icon.Star, tintColor: Color.SecondaryText },
                            tooltip: "⌘ S",
                          },
                        ]
                      : [])) ||
              []
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Resize to ${resolution.title}`}
                  icon={{
                    source: resolution.isCustom ? "icons/custom-size.svg" : "icons/default-size.svg",
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
                        source: "icons/unstar.svg",
                        fallback: Icon.StarDisabled,
                        tintColor: Color.PrimaryText,
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      onAction={async () => {
                        try {
                          if (!onToggleStar) {
                            return;
                          }
                          await onToggleStar(resolution);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Removed from Starred Sizes",
                          });
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
                          source: "icons/star-check.svg",
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
                      source: "icons/star.svg",
                      fallback: Icon.Star,
                      tintColor: Color.PrimaryText,
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={async () => {
                      try {
                        if (!onToggleStar) {
                          return;
                        }
                        await onToggleStar(resolution);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Marked as Starred",
                        });
                      } catch (error) {
                        await showFailureToast("Failed to mark as starred", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }}
                  />
                )}
                {showDeleteAction && resolution.isCustom && onDeleteResolution && (
                  <Action
                    title="Delete Custom Size"
                    icon={{ source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      try {
                        // First remove from starred list if it's starred
                        if (resolutionIsStarred) {
                          await onToggleStar?.(resolution);
                        }

                        // Then delete the custom resolution
                        await onDeleteResolution(resolution);
                      } catch (error) {
                        await showFailureToast("Failed to delete size", {
                          message: error instanceof Error ? error.message : String(error),
                        });
                      }
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
