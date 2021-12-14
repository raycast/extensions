import { ActionPanel, ActionPanelItem, Detail, Icon, Toast, ToastStyle, useNavigation } from "@raycast/api";
import { deleteTimeEntry } from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";

export default function Command({
  entry,
  onComplete = async () => {
    return;
  },
}: {
  entry: HarvestTimeEntry;
  onComplete: () => Promise<void>;
}) {
  // This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.window.requestAnimationFrame = setTimeout;

  const { pop } = useNavigation();

  const message = `# 🚨 Are you sure? 🚨
  This will permantly delete the following time entry and cannot be undone.
  
  ---
  
  Project: **${entry.project.name}**

  Task: **${entry.task.name}**

  Client: **${entry.client.name}**

  Notes: **${entry.notes}**

  Time Tracked: **${entry.hours}**`;

  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanelItem
            title="Delete"
            icon={Icon.Trash}
            onAction={async () => {
              const toast = new Toast({ style: ToastStyle.Animated, title: "Deleting..." });
              await toast.show();
              await deleteTimeEntry(entry);
              await onComplete();
              await toast.hide();
              pop();
            }}
          />
        </ActionPanel>
      }
      markdown={message}
    />
  );
}
