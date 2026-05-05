import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import useProductboardPaginated from "./lib/hooks/useProductboardPaginated";
import { Objective } from "./lib/types";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";

const STATUS_COLOR: Record<string, Color> = {
  "In Progress": Color.Yellow,
  Upcoming: Color.Blue,
  Completed: Color.Green,
};
export default function Objectives() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data: objectives, pagination } = useProductboardPaginated<Objective>("objectives");

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search objectives"
    >
      {objectives.map((objective) => (
        <List.Item
          key={objective.id}
          title={objective.name || "Unnamed objective"}
          icon={{ source: Icon.BullsEye, tintColor: STATUS_COLOR[objective.status.name] }}
          accessories={[{ date: new Date(objective.updatedAt) }]}
          detail={<List.Item.Detail markdown={objective.description} />}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Details"
                icon={Icon.AppWindowSidebarLeft}
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
              <Action.OpenInBrowser
                title="Open in Productboard"
                icon={getFavicon(objective.links.html, { fallback: "logo.png" })}
                url={objective.links.html}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
