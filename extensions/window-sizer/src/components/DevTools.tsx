import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation, Color } from "@raycast/api";
import { useScreenInfo } from "../hooks/useScreenInfo";
import { ScreenInfoDetails } from "./ScreenInfoDetails";
import { showFailureToast } from "@raycast/utils";

export function DevTools() {
  const { clearCache, isDevMode } = useScreenInfo();
  const { push } = useNavigation();

  // Don't show anything if not in development mode
  if (!isDevMode) {
    return null;
  }

  return (
    <>
      <List.Item
        title="Get Screen Info"
        icon={{ source: "icons/screen-info.svg", fallback: Icon.Desktop, tintColor: Color.SecondaryText }}
        accessories={[{ text: "Dev" }]}
        actions={
          <ActionPanel>
            <Action
              title="Get Screen Info"
              icon={{ source: "icons/screen-info.svg", fallback: Icon.Desktop, tintColor: Color.PrimaryText }}
              onAction={() => {
                push(<ScreenInfoDetails />);
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Clear Screen Cache"
        icon={{ source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.SecondaryText }}
        accessories={[{ text: "Dev" }]}
        actions={
          <ActionPanel>
            <Action
              title="Clear Screen Cache"
              icon={{ source: "icons/clear.svg", fallback: Icon.Trash, tintColor: Color.PrimaryText }}
              onAction={async () => {
                try {
                  await clearCache();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Cache cleared",
                  });
                } catch (error) {
                  await showFailureToast("Failed to clear cache", {
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    </>
  );
}
