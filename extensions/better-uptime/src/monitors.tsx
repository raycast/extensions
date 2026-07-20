import { Action, ActionPanel, Color, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { baseUrl, statusMap } from "./constants";
import { MonitorItem, MonitorsState, MonitorGroupsState, Preferences } from "./interface";
import { formatDateTime, getMonitorFrequency, ucfirst } from "./utils";
import { ActionCopyUrl, ActionDeleteMonitor } from "./actions";
import { useFetch } from "@raycast/utils";
import AddMonitorCommand from "./add-monitor";

export default function MonitorsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const {
    isLoading: isLoadingMonitors,
    data: monitors,
    revalidate,
  } = useFetch<MonitorsState>(`${baseUrl}/monitors`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });

  const { isLoading: isLoadingGroups, data: monitorGroups } = useFetch<MonitorGroupsState>(
    `${baseUrl}/monitor-groups`,
    {
      headers: { Authorization: `Bearer ${preferences.apiKey}` },
    },
  );

  const isLoading = isLoadingMonitors || isLoadingGroups;

  const groupNameMap =
    monitorGroups?.data.reduce(
      (acc, group) => {
        acc[group.id] = group.attributes.name;
        return acc;
      },
      {} as { [key: string]: string },
    ) ?? {};

  const getGroupTitle = (groupId: string): string => {
    if (groupId === "ungrouped") {
      return "Ungrouped Monitors";
    }
    return groupNameMap[groupId] || `Group ${groupId}`;
  };

  const grouppedMonitors = monitors?.data.reduce(
    (acc, monitor) => {
      const type = monitor.attributes.monitor_group_id || "ungrouped";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(monitor);
      return acc;
    },
    {} as { [key: string]: typeof monitors.data },
  );

  if (!grouppedMonitors || !Object.keys(grouppedMonitors).length) {
    return (
      <List
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Add Monitor" onAction={() => push(<AddMonitorCommand />)} />
          </ActionPanel>
        }
      >
        <List.EmptyView title="No Monitors" description="You can add a monitor using the 'Add Monitor' command." />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {grouppedMonitors["ungrouped"] &&
        grouppedMonitors["ungrouped"].map((item) => <Monitor item={item} onDeleted={revalidate} key={item.id} />)}

      {Object.keys(grouppedMonitors)
        .filter((groupIndex) => groupIndex !== "ungrouped")
        .map((groupIndex) => (
          <List.Section title={getGroupTitle(groupIndex)} key={groupIndex}>
            {grouppedMonitors[groupIndex].map((item) => (
              <Monitor item={item} onDeleted={revalidate} key={item.id} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function Monitor({ item, onDeleted }: { item: MonitorItem; onDeleted: () => void }) {
  return (
    <List.Item
      icon={statusMap[item.attributes.status] ?? statusMap.pending}
      title={item.attributes.pronounceable_name}
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

              <List.Item.Detail.Metadata.Label title="Status" text={ucfirst(item.attributes.status)} />
              <List.Item.Detail.Metadata.Label title="Monitor Type" text={ucfirst(item.attributes.monitor_type)} />
              {item.attributes.url && (
                <List.Item.Detail.Metadata.Link title="URL" text={item.attributes.url} target={item.attributes.url} />
              )}

              {item.attributes.http_method && (
                <List.Item.Detail.Metadata.Label title="HTTP Method" text={item.attributes.http_method.toUpperCase()} />
              )}
              <List.Item.Detail.Metadata.Label title="Check Frequency" text={getMonitorFrequency(item)} />
              <List.Item.Detail.Metadata.Label
                title="Last Checked At"
                text={formatDateTime(item.attributes.last_checked_at)}
              />

              {item.attributes.regions && item.attributes.regions.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Regions">
                  {item.attributes.regions.map((region) => (
                    <List.Item.Detail.Metadata.TagList.Item key={region} text={region.toUpperCase()} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}

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
          <Action.OpenInBrowser title="Open URL in Browser" url={item.attributes.url} />
          <ActionCopyUrl url={item.attributes.url} />
          <ActionDeleteMonitor item={item} onDeleted={onDeleted} />
        </ActionPanel>
      }
    />
  );
}
