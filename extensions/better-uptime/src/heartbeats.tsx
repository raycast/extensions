import { Action, ActionPanel, Color, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { ActionCopyHeartbeatUrl, ActionDeleteHeartbeat } from "./actions";
import { baseUrl, statusMap } from "./constants";
import { HeartbeatsState, HeartbeatGroupsState, Preferences, HeartbeatItem } from "./interface";
import { useFetch } from "@raycast/utils";
import AddHeartbeatCommand from "./add-heartbeat";

export default function HeartbeatsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const {
    isLoading: isLoadingHeartbeats,
    data: heartbeats,
    revalidate,
  } = useFetch<HeartbeatsState>(`${baseUrl}/heartbeats`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });

  const { isLoading: isLoadingGroups, data: heartbeatGroups } = useFetch<HeartbeatGroupsState>(
    `${baseUrl}/heartbeat-groups`,
    {
      headers: { Authorization: `Bearer ${preferences.apiKey}` },
    },
  );

  const isLoading = isLoadingHeartbeats || isLoadingGroups;

  const groupNameMap =
    heartbeatGroups?.data.reduce(
      (acc, group) => {
        acc[group.id] = group.attributes.name;
        return acc;
      },
      {} as { [key: string]: string },
    ) ?? {};

  const getGroupTitle = (groupId: string): string => {
    if (groupId === "ungrouped") {
      return "Ungrouped Heartbeats";
    }
    return groupNameMap[groupId] || `Group ${groupId}`;
  };

  const grouppedHeartbeats = heartbeats?.data.reduce(
    (acc, heartbeat) => {
      const type = heartbeat.attributes.heartbeat_group_id || "ungrouped";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(heartbeat);
      return acc;
    },
    {} as { [key: string]: typeof heartbeats.data },
  );

  if (!grouppedHeartbeats || !Object.keys(grouppedHeartbeats).length) {
    return (
      <List
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Add Heartbeat" onAction={() => push(<AddHeartbeatCommand />)} />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="No Heartbeats"
          description="You can add a heartbeat using the 'Add Heartbeat' command."
        />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {grouppedHeartbeats["ungrouped"] &&
        grouppedHeartbeats["ungrouped"].map((item) => <Heartbeat item={item} onDeleted={revalidate} key={item.id} />)}

      {Object.keys(grouppedHeartbeats)
        .filter((groupIndex) => groupIndex !== "ungrouped")
        .map((groupIndex) => (
          <List.Section title={getGroupTitle(groupIndex)} key={groupIndex}>
            {grouppedHeartbeats[groupIndex].map((item) => (
              <Heartbeat item={item} onDeleted={revalidate} key={item.id} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function Heartbeat({ item, onDeleted }: { item: HeartbeatItem; onDeleted: () => void }) {
  return (
    <List.Item
      icon={statusMap[item.attributes.status] ?? statusMap.pending}
      title={item.attributes.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="General"
                text={{
                  color: Color.SecondaryText,
                  value: `ID: ${item.id}`,
                }}
              />

              <List.Item.Detail.Metadata.Label title="Name" text={item.attributes.name} />
              <List.Item.Detail.Metadata.Label title="Period" text={`${item.attributes.period}`} />
              <List.Item.Detail.Metadata.Label title="Grace" text={`${item.attributes.grace}`} />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Notifications" />

              <List.Item.Detail.Metadata.Label title="Call" text={item.attributes.call ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="SMS" text={item.attributes.sms ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="Email" text={item.attributes.email ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="Push" text={item.attributes.push ? "Yes" : "No"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Heartbeat URL in Browser" url={item.attributes.url} />
          <ActionCopyHeartbeatUrl url={item.attributes.url} />
          <ActionDeleteHeartbeat item={item} onDeleted={onDeleted} />
        </ActionPanel>
      }
    />
  );
}
