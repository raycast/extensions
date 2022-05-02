import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { formatDuration, intervalToDuration, subSeconds } from "date-fns";

import { useSummary, useUser } from "./hooks";

export default function Command() {
  const summary = useSummary();
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
      {summary.data !== undefined && (
        <List.Section title="Stats Summary">
          {summary.data.map(([key, range]) => (
            <List.Item
              key={key}
              title={key}
              accessories={[
                {
                  tooltip: "Cumulative Total",
                  text: formatDuration(
                    intervalToDuration({
                      start: subSeconds(new Date(), range.cummulative_total.seconds),
                      end: new Date(),
                    })
                  ),
                },
              ]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
