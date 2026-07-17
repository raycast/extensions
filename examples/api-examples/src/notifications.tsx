import { ActionPanel, Detail, showHUD, showToast, Toast, Action } from "@raycast/api";
import { setTimeout } from "timers/promises";

const description = `
# Notifications

In Raycast, users perform actions to create or update content. It's best to confirm these actions
with visual elements. For this, you can show toasts or HUDs.

## Toasts

With toasts, you can notify the user about success, loading or failure states of actions. We use
them for confirming network requests, e.g. updating a Linear issue.

## HUDs

HUDs are perfect to show when you confirm a small action. Showing a HUD closes the main window.
We use them when you copy something to the clipboard, e.g. in the Clipboard History.
`;

export default function Command() {
  return (
    <Detail
      markdown={description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Show Success Toast"
              onAction={() =>
                showToast({
                  style: Toast.Style.Success,
                  title: "Showed success toast",
                })
              }
            />
            <Action
              title="Show Failure Toast with Message"
              onAction={() =>
                showToast({
                  style: Toast.Style.Failure,
                  title: "Showed failure toast",
                  message: "Message with additional information",
                })
              }
            />
            <AnimatedToast />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Show Hud" onAction={() => showHUD("Showed HUD")} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AnimatedToast() {
  async function showAnimatedToast() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating something" });

    await setTimeout(1000);

    toast.style = Toast.Style.Success;
    toast.title = "Updated something";
  }

  return <Action title="Show Animated Toast" onAction={showAnimatedToast} />;
}
