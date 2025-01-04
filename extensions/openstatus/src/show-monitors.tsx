import { Action, ActionPanel, getPreferenceValues, List, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { monitorSchema, WhoamiSchema } from "./api/schema";
import type { Preferences } from "./interface";
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
      {data
        ?.filter((monitor) => monitor.active === true)
        .map((monitor) => (
          <List.Item
            key={monitor.id}
            title={monitor.name}
            subtitle={monitor.url}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View Monitor"
                  url={`https://www.openstatus.dev/app/${whoamiData?.slug}/monitors/${monitor.id}/overview`}
                />
                <Action
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
