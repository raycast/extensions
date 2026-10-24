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
  const {
    isLoading,
    data: objectives,
    pagination,
  } = useProductboardPaginated<Objective>("entities", {
    "type[]": "objective",
  });

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
          title={objective.fields.name || "Unnamed objective"}
          icon={{
            source: Icon.BullsEye,
            tintColor: objective.fields.status
              ? (STATUS_COLOR[objective.fields.status.name] ?? Color.SecondaryText)
              : Color.SecondaryText,
          }}
          accessories={[{ date: new Date(objective.updatedAt) }]}
          detail={<List.Item.Detail markdown={objective.fields.description || "No description"} />}
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
