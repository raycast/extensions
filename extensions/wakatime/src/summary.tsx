import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { useUser } from "./hooks";
import { ActivityChange, ProjectsStatsList, RangeStatsList } from "./components";

export default function SummaryCommand() {
  const { data: { data } = {}, isLoading } = useUser();
  const [showDetail, setShowDetail] = useState(false);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {data !== undefined && (
        <List.Section title="Profile">
          <List.Item
            subtitle={data.username}
            title={data.display_name}
            accessories={
              showDetail
                ? null
                : [{ icon: Icon.Globe, tooltip: "Timezone", text: data.timezone ?? "Timezone is missing" }]
            }
            icon={data.photo_public ? { source: data.photo, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.profile_url} title="Open in Browser" />
                <Action.OpenInBrowser title="Official WakaTime Insights" url="https://wakatime.com/insights" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <ActivityChange {...{ showDetail, setShowDetail }} />
      <RangeStatsList {...{ showDetail, setShowDetail }} />
      <ProjectsStatsList />
    </List>
  );
}
