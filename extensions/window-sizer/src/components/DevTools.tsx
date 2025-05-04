import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useScreenInfo } from "../hooks/useScreenInfo";
import { ScreenInfoDetails } from "./ScreenInfoDetails";

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
        icon={Icon.Desktop}
        accessories={[{ text: "Dev" }]}
        actions={
          <ActionPanel>
            <Action
              title="Check Screen Info"
              onAction={() => {
                push(<ScreenInfoDetails />);
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Clear Screen Cache"
        icon={Icon.Trash}
        accessories={[{ text: "Dev" }]}
        actions={
          <ActionPanel>
            <Action
              title="Clear Screen Information Cache"
              icon={Icon.Trash}
              onAction={async () => {
                await clearCache();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Cache cleared",
                });
              }}
            />
          </ActionPanel>
        }
      />
    </>
  );
}
