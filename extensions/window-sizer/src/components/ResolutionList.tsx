import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Resolution } from "../types";
import { showFailureToast } from "@raycast/utils";

interface ResolutionListProps {
  resolutions: Resolution[];
  onResizeWindow: (width: number, height: number) => Promise<void>;
  sectionTitle?: string;
  showDeleteAction?: boolean;
  onDeleteResolution?: (resolution: Resolution) => Promise<void>;
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
}: ResolutionListProps) {
  return (
    <List.Section title={sectionTitle}>
      {resolutions.map((resolution) => (
        <List.Item
          key={`${resolution.isCustom ? "custom" : "default"}-${resolution.title}`}
          title={resolution.title}
          icon={{
            source: resolution.isCustom ? "icons/custom-size.svg" : "icons/default-size.svg",
            fallback: Icon.AppWindow,
            tintColor: Color.PrimaryText,
          }}
          accessories={
            showDeleteAction && resolution.isCustom
              ? [
                  {
                    icon: { source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.SecondaryText },
                    tooltip: "⌘ ⏎",
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
              {showDeleteAction && resolution.isCustom && onDeleteResolution && (
                <Action
                  title="Delete Custom Size"
                  icon={{ source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
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
