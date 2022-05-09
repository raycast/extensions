import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { useActivityChange, useUser } from "./hooks";
import { ProjectsStatsList, RangeStatsList } from "./components";

export default function Command() {
  const change = useActivityChange();
  const { data, isLoading } = useUser();
  const [showDetail, setShowDetail] = useState(false);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {data !== undefined && (
        <List.Section title="Profile">
          <List.Item
            subtitle={data.username}
            title={data.display_name}
            accessories={[{ icon: Icon.Envelope, tooltip: data.public_email }]}
            icon={data.photo_public ? { source: data.photo, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.profile_url} title="Open in Browser" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!!change.data.duration && (
        <List.Item
          title={change.data.duration}
          accessories={[{ text: `${change.data.percent}%  ${change.data.emoji}` }]}
        />
      )}
      <RangeStatsList {...{ showDetail, setShowDetail }} />
      <ProjectsStatsList />
    </List>
  );
}
