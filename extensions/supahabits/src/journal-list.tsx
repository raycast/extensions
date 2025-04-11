import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { JournalEntry } from "./models/journal-entry";

export default function JournalListCommand() {
  const { secret } = getPreferenceValues<Preferences>();
  const { isLoading, data } = useFetch(`https://www.supahabits.com/api/journal?secret=${secret}`, {
    parseResponse: async (response) => {
      return (await response.json()) as JournalEntry[];
    },
    onError: async (error) => {
      if (error.message.indexOf("Unauthorized") !== -1) {
        await showHUD("⛔ Unauthorized, Please set your secret in the extension preferences");
        await openExtensionPreferences();
      }
    },
  });

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!isLoading && data && data.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Pencil}
          title="No entries found - create one!"
          actions={
            <ActionPanel>
              <Action
                title="New Entry"
                onAction={() =>
                  launchCommand({
                    name: "journal",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          title={item.content}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View/edit Entry"
                url={`https://www.supahabits.com/dashboard/journal/${item.id}`}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
