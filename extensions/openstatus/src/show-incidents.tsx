import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { incidentSchema, WhoamiSchema } from "./api/schema";

export default function ShowIncidents() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data: incidents } = useFetch("https://api.openstatus.dev/v1/incident", {
    headers: {
      "x-openstatus-key": `${preferences.access_token}`,
    },
    mapResult(result) {
      return { data: incidentSchema.array().parse(result) };
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
    <List isLoading={isLoading || isWhoamiLoading}>
      {incidents.map((incident) => (
        <List.Item
          key={incident.id}
          icon={
            incident.resolvedAt
              ? { source: Icon.Check, tintColor: Color.Green }
              : incident.acknowledgedAt
                ? { source: Icon.Warning, tintColor: Color.Yellow }
                : { source: Icon.ExclamationMark, tintColor: Color.Red }
          }
          title={`Monitor: ${incident.monitorId}`}
          subtitle={`started: ${incident.startedAt}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Incident"
                url={`https://www.openstatus.dev/app/${whoamiData?.slug}/incidents/${incident.id}/overview`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
