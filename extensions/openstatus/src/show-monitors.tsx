import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { monitorSchema, WhoamiSchema } from "./api/schema";
import fetch from "node-fetch";

export default function ShowMonitors() {
  const preferences = getPreferenceValues<Preferences>();

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
    <List isLoading={isLoading && isWhoamiLoading}>
      {data.map((monitor) => (
        <List.Item
          key={monitor.id}
          icon={{
            tooltip: monitor.active ? "Monitor is active" : "Monitor is inactive",
            value: { source: Icon.Dot, tintColor: monitor.active ? Color.Green : Color.Red },
          }}
          title={monitor.name}
          subtitle={monitor.url}
          accessories={[
            { icon: monitor.public ? Icon.Eye : Icon.EyeDisabled, tooltip: monitor.public ? "Public" : "Private" },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Monitor"
                url={`https://www.openstatus.dev/app/${whoamiData?.slug}/monitors/${monitor.id}/overview`}
              />
              <Action
                icon={Icon.Hammer}
                title="Trigger Monitor Execution"
                onAction={async () => {
                  await fetch(`https://api.openstatus.dev/v1/monitor/${monitor.id}/trigger`, {
                    headers: {
                      "x-openstatus-key": `${preferences.access_token}`,
                    },
                    method: "POST",
                  });
                  showToast({ title: "Trigger Run", message: "Run" });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
