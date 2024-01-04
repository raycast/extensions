import { List, ActionPanel, Action } from "@raycast/api";
import { adjustBrightness, getSystemBrightness } from "./utils";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { data: brightness, isLoading, revalidate } = usePromise(getSystemBrightness, []);

  return (
    <List isLoading={isLoading}>
      <List.Item
        id="brightness"
        title="Keyboard Brightness"
        accessories={
          brightness !== null ? [{ text: `${brightness! * 100}%` }] : undefined
        }
        actions={
          <ActionPanel>
            <Action
              title="Increase Brightness"
              onAction={async () => {
                await adjustBrightness(brightness!, "increase");
                revalidate();
              }}
            />
            <Action
              title="Decrease Brightness"
              onAction={async () => {
                await adjustBrightness(brightness!, "decrease");
                revalidate();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
