import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import fetch from "node-fetch";
import { useAsync } from "react-use";

interface Status {
  components: StatusComponent[];
  incidents: StatusIncident[];
}

interface StatusIncident {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  shortlink: string;
  incident_updates: StatusIncidentUpdate[];
}

interface StatusIncidentUpdate {
  id: string;
  status: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface StatusComponent {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  position: number;
  description: string;
  only_show_if_degraded: boolean;
}

const colorsMap: Record<string, string> = {
  operational: Color.Green,
  partial_outage: Color.Yellow,
  major_outage: Color.Red,
};

const statusMap: Record<string, string> = {
  operational: "Operational",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
};

export default function Command() {
  const data = useAsync<() => Promise<Status>>(
    () =>
      fetch("https://www.githubstatus.com/api/v2/summary.json").then(async (res) => {
        return (await res.json()) as Status;
      }),
    []
  );

  return (
    <List isLoading={data.loading}>
      {data.value?.incidents && (
        <List.Section title="Incidents">
          {data.value?.incidents?.map((incident) => (
            <List.Item
              key={incident.id}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
              title={incident.name}
              accessoryTitle={`${incident.incident_updates.length} updates`}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Show Updates" url={incident.shortlink} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Components">
        {data.value?.components
          .filter((component) => component.name !== "Visit www.githubstatus.com for more information")
          .sort((a, b) => a.position - b.position)
          .map((component) => (
            <List.Item
              key={component.id}
              icon={{ source: Icon.Dot, tintColor: colorsMap[component.status] }}
              title={component.name}
              subtitle={component.description}
              accessoryTitle={statusMap[component.status]}
            />
          ))}
      </List.Section>
    </List>
  );
}
