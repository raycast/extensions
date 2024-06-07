import { Action, ActionPanel, getPreferenceValues, launchCommand, LaunchType, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { JournalEntry } from "./models/journal-entry";

export default function JournalListCommand() {
  const { secret } = getPreferenceValues<Preferences>();
  const { isLoading, data } = useFetch(`https://www.supahabits.com/api/journal?secret=${secret}`, {
    parseResponse: async (response) => {
      return (await response.json()) as JournalEntry[];
    },
  });

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!isLoading && data && data.length === 0) {
    return (
      <List>
        <List.Item
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
        <List.Item key={item.id} title={item.content} />
      ))}
    </List>
  );
}
