import { List, ActionPanel, Action, Icon, Color, Toast } from "@raycast/api";
import { Resolution } from "../types";
import { showFailureToast } from "@raycast/utils";
import { showToast } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

interface ResolutionListProps {
  resolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  sectionTitle?: string;
  showDeleteAction?: boolean;
  onDeleteResolution?: (resolution: Resolution) => Promise<void>;
  onToggleStar?: (resolution: Resolution) => Promise<void>;
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
}: ResolutionListProps) {
  return (
    <List.Section title={sectionTitle}>
      {resolutions.map((resolution) => (
        <List.Item
          key={`${resolution.isCustom ? "custom" : "default"}-${resolution.title}`}
          title={resolution.title}
          icon={{
            source: resolution.isStarred
              ? "icons/starred-size.svg"
              : resolution.isCustom
                ? "icons/custom-size.svg"
                : "icons/size.svg",
            fallback: Icon.AppWindow,
            tintColor: Color.SecondaryText,
          }}
          accessories={
            showDeleteAction && resolution.isCustom
              ? [
                  {
                    icon: { source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.SecondaryText },
                    tooltip: "⌘ D",
                  },
                ]
              : resolution.isStarred
                ? [
                    {
                      icon: { source: "icons/unstar.svg", fallback: Icon.Star, tintColor: Color.SecondaryText },
                      tooltip: "⇧ ⌘ S",
                    },
                  ]
                : []
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
              <Action
                title={resolution.isStarred ? "Remove from Starred" : "Mark as Starred"}
                icon={{
                  source: resolution.isStarred ? "icons/unstar.svg" : "icons/star.svg",
                  fallback: Icon.Star,
                  tintColor: Color.PrimaryText,
                }}
                shortcut={{
                  modifiers: resolution.isStarred ? ["cmd", "shift"] : ["cmd"],
                  key: "s",
                }}
                onAction={async () => {
                  try {
                    if (onToggleStar) {
                      if (resolution.isStarred) {
                        await onToggleStar(resolution);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Removed from Starred",
                        });
                      } else {
                        // Check if resolution already exists in starred list
                        const starredResolutions = await LocalStorage.getItem<string>("starred-resolutions");
                        if (starredResolutions) {
                          const existingResolutions = JSON.parse(starredResolutions);
                          const alreadyExists = existingResolutions.some(
                            (r: Resolution) => r.title === resolution.title,
                          );
                          if (alreadyExists) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Already existed in Starred Sizes",
                            });
                            return;
                          }
                        }
                        await onToggleStar(resolution);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Marked as Starred",
                        });
                      }
                    }
                  } catch (error) {
                    await showFailureToast("Failed to toggle star status", {
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
              {showDeleteAction && resolution.isCustom && onDeleteResolution && (
                <Action
                  title="Delete Custom Size"
                  icon={{ source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    try {
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
      ))}
    </List.Section>
  );
}
