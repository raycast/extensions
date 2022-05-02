import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { useUser } from "./hooks";
import { SummaryList } from "./components";

export default function Command() {
  const { data, isLoading } = useUser();

  return (
    <List isLoading={isLoading}>
      {data !== undefined && (
        <List.Section title="Profile">
          <List.Item
            subtitle={data.username}
            title={data.display_name}
            accessories={[{ icon: Icon.Envelope, tooltip: data.public_email }]}
            icon={data.photo_public ? { source: data.photo, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.profile_url} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <SummaryList />
    </List>
  );
}
