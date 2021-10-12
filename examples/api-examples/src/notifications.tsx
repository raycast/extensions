import { ActionPanel, Detail, showHUD, showToast, Toast, ToastStyle } from "@raycast/api";
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
            <ActionPanel.Item
              title="Show Success Toast"
              onAction={() => showToast(ToastStyle.Success, "Showed success toast")}
            />
            <ActionPanel.Item
              title="Show Failure Toast with Message"
              onAction={() =>
                showToast(ToastStyle.Failure, "Showed failure toast", "Message with additional information")
              }
            />
            <AnimatedToast />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Item title="Show HUD" onAction={() => showHUD("Showed HUD")} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AnimatedToast() {
  async function showAnimatedToast() {
    const toast = new Toast({ style: ToastStyle.Animated, title: "Updating something" });
    toast.show();

    await setTimeout(1000);

    toast.style = ToastStyle.Success;
    toast.title = "Updated something";
  }

  return <ActionPanel.Item title="Show Animated Toast" onAction={showAnimatedToast} />;
}
