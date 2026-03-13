import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { monitorSchema, WhoamiSchema } from "./api/schema";

export default function ShowMonitors() {
  const preferences = getPreferenceValues<Preferences>();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-monitor-details", false);

  const { isLoading, data } = useFetch("https://api.openstatus.dev/v1/monitor", {
    headers: {
      "x-openstatus-key": `${preferences.access_token}`,
    },
    mapResult(result) {
      return { data: monitorSchema.array().parse(result) };
    },
    keepPreviousData: true,
    initialData: [],
  });

  const { isLoading: isWhoamiLoading, data: whoamiData } = useFetch("https://api.openstatus.dev/v1/whoami", {
    headers: {
      "x-openstatus-key": `${preferences.access_token}`,
    },
    mapResult(result) {
      return { data: WhoamiSchema.parse(result) };
    },
  });

  return (
    <List isLoading={isLoading && isWhoamiLoading} isShowingDetail={isShowingDetail}>
      {data.map((monitor) => (
        <List.Item
          key={monitor.id}
          icon={{
            tooltip: monitor.active ? "Monitor is active" : "Monitor is inactive",
            value: { source: Icon.Dot, tintColor: monitor.active ? Color.Green : Color.Red },
          }}
          title={monitor.name}
          subtitle={isShowingDetail ? undefined : monitor.url}
          accessories={
            isShowingDetail
              ? undefined
              : [{ icon: monitor.public ? Icon.Eye : Icon.EyeDisabled, tooltip: monitor.public ? "Public" : "Private" }]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={monitor.id.toString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Name"
                    text={monitor.name}
                    icon={monitor.name ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={monitor.description}
                    icon={monitor.description ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label title="Periodicity" text={monitor.periodicity} />
                  <List.Item.Detail.Metadata.Link title="URL" text={monitor.url} target={monitor.url} />
                  <List.Item.Detail.Metadata.TagList title="Regions">
                    {monitor.regions.map((region) => (
                      <List.Item.Detail.Metadata.TagList.Item key={region} text={region} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Active" icon={monitor.active ? Icon.Check : Icon.Xmark} />
                  <List.Item.Detail.Metadata.Label title="Public" icon={monitor.public ? Icon.Check : Icon.Xmark} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
              <Action.OpenInBrowser
                title="View Monitor"
                url={`https://www.openstatus.dev/app/${whoamiData?.slug}/monitors/${monitor.id}/overview`}
              />
              <Action
                icon={Icon.Hammer}
                title="Trigger Monitor Execution"
                onAction={async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Triggering Run" });
                  try {
                    await fetch(`https://api.openstatus.dev/v1/monitor/${monitor.id}/trigger`, {
                      headers: {
                        "x-openstatus-key": `${preferences.access_token}`,
                      },
                      method: "POST",
                    });
                  } catch {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Could not Trigger Run";
                  }
                  toast.style = Toast.Style.Success;
                  toast.message = "Run";
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
