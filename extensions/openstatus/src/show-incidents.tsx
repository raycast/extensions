import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Incident, incidentSchema, WhoamiSchema } from "./api/schema";
import fetch from "node-fetch";

export default function ShowIncidents() {
  const preferences = getPreferenceValues<Preferences>();

  const {
    isLoading,
    data: incidents,
    mutate,
  } = useFetch("https://api.openstatus.dev/v1/incident", {
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

  async function updateIncident(incident: Incident, { action }: { action: "acknowledge" | "resolve" }) {
    const toast = await showToast(
      Toast.Style.Animated,
      action === "acknowledge" ? "Acknowledging" : "Resolving",
      incident.id.toString(),
    );
    try {
      const at = new Date().toISOString();
      const body = action === "acknowledge" ? { acknowledgedAt: at } : { resolvedAt: at };
      await mutate(
        fetch(`https://api.openstatus.dev/v1/incident/${incident.id}`, {
          method: "PUT",
          headers: {
            "x-openstatus-key": `${preferences.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        {
          optimisticUpdate(data) {
            const index = data.findIndex((i) => i.id === incident.id);
            data[index] = { ...incident, ...body };
            return data;
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = action === "acknowledge" ? "Acknowledged" : "Resolved";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = action === "acknowledge" ? "Could not acknowledge" : "Could not resolve";
    }
  }

  const acknowledgeIcon = { source: Icon.Warning, tintColor: Color.Yellow };
  const resolveIcon = { source: Icon.Check, tintColor: Color.Green };

  return (
    <List isLoading={isLoading || isWhoamiLoading}>
      {incidents.map((incident) => {
        const accessories: List.Item.Accessory[] = [];
        if (incident.acknowledgedAt)
          accessories.push({
            icon: acknowledgeIcon,
            date: new Date(incident.acknowledgedAt),
            tooltip: `Acknowledged At: ${incident.acknowledgedAt}`,
          });
        if (incident.resolvedAt)
          accessories.push({
            icon: resolveIcon,
            date: new Date(incident.resolvedAt),
            tooltip: `Resolved At: ${incident.resolvedAt}`,
          });
        return (
          <List.Item
            key={incident.id}
            icon={
              incident.resolvedAt
                ? resolveIcon
                : incident.acknowledgedAt
                  ? acknowledgeIcon
                  : { source: Icon.Warning, tintColor: Color.Red }
            }
            title={`Monitor: ${incident.monitorId}`}
            subtitle={`started: ${incident.startedAt}`}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View Incident"
                  url={`https://www.openstatus.dev/app/${whoamiData?.slug}/incidents/${incident.id}/overview`}
                />
                {!incident.acknowledgedAt && (
                  <Action
                    icon={acknowledgeIcon}
                    title="Acknowledge Incident"
                    onAction={() => updateIncident(incident, { action: "acknowledge" })}
                  />
                )}
                {incident.acknowledgedAt && !incident.resolvedAt && (
                  <Action
                    icon={resolveIcon}
                    title="Resolve Incident"
                    onAction={() => updateIncident(incident, { action: "resolve" })}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
