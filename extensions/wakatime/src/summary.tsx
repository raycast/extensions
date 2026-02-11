import { useMemo, useState } from "react";
import { getAvatarIcon } from "@raycast/utils";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { useUser } from "./hooks";
import { ActivityChange, ProjectsStatsList, RangeStatsList } from "./components";

export default function SummaryCommand() {
  const { data: { data } = {}, isLoading } = useUser();
  const [showDetail, setShowDetail] = useState(false);

  const accessories = useMemo<List.Item.Props["accessories"]>(() => {
    if (showDetail || data?.id == null) return null;

    return [
      { icon: Icon.Globe, tooltip: "Timezone", text: data.timezone ?? "Timezone is missing" },
      data.has_premium_features ? { icon: Icon.Star, text: "Pro" } : null,
    ].filter((i) => i != null);
  }, [showDetail, data?.id, data?.timezone, data?.has_premium_features]);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {data != null && (
        <List.Section title="Profile">
          <List.Item
            subtitle={data.username}
            title={data.display_name}
            accessories={accessories}
            icon={
              data.photo_public ? { source: data.photo, mask: Image.Mask.Circle } : getAvatarIcon(data.display_name)
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.profile_url} title="Open in Browser" />
                <Action.OpenInBrowser title="Official Wakatime Insights" url="https://wakatime.com/insights" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <ActivityChange showDetail={showDetail} setShowDetail={setShowDetail} />
      <RangeStatsList
        isPro={data?.has_premium_features ?? false}
        showDetail={showDetail}
        setShowDetail={setShowDetail}
      />
      <ProjectsStatsList />
    </List>
  );
}
