import { Action, ActionPanel, List, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { MEETING_ACTIONS, STATUSES, runMeetingAction, setStatus } from "./lib/meeting";

async function run(work: () => Promise<void>, failure: string) {
  await closeMainWindow();
  try {
    await work();
  } catch (error) {
    await showFailureToast(error, { title: failure });
  }
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Meeting action or status">
      <List.Section title="Meeting">
        {MEETING_ACTIONS.map((action) => (
          <List.Item
            key={action.id}
            title={action.title}
            icon={action.icon}
            accessories={[{ text: "⌘⇧" + ("char" in action.key ? action.key.char.toUpperCase() : "") }]}
            actions={
              <ActionPanel>
                <Action
                  title={action.title}
                  icon={action.icon}
                  onAction={() => run(() => runMeetingAction(action.id), "Teams did not get the shortcut")}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Status">
        {STATUSES.map((status) => (
          <List.Item
            key={status.value}
            title={status.title}
            icon={status.icon}
            actions={
              <ActionPanel>
                <Action
                  title={`Set Status to ${status.title}`}
                  icon={status.icon}
                  onAction={() =>
                    run(async () => {
                      await setStatus(status.value);
                      await showHUD(`Teams status: ${status.title}`);
                    }, "Could not set the status")
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
