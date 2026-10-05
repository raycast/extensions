import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format, parseISO } from "date-fns";
import { MutatePromise } from "@raycast/utils";
import { IncidentItem } from "../types";
import { UpdateIncidentStatusAction } from "./UpdateIncidentStatusAction";

interface IncidentListItemProps {
  incident: IncidentItem;
  mutateIncidents: MutatePromise<IncidentItem[]>;
}

export function IncidentListItem({ incident, mutateIncidents }: IncidentListItemProps) {
  return (
    <List.Item
      key={incident.id}
      title={`#${incident.incident_number}: ${incident.title}`}
      accessories={[
        {
          text: format(parseISO(incident.created_at), "yyyy/MM/dd HH:mm:ss"),
        },
      ]}
      actions={
        <ActionPanel title={incident.title}>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={incident.html_url}
              title="Open Incident in Browser"
              shortcut={{ key: "enter", modifiers: [] }}
            />
            <Action.CopyToClipboard
              content={incident.html_url}
              title="Copy Link to Clipboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          {incident.status === "resolved" ? (
            <></>
          ) : (
            <ActionPanel.Section>
              <UpdateIncidentStatusAction item={incident} mutateIncidents={mutateIncidents} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
      icon={{
        source: {
          resolved: Icon.CheckCircle,
          acknowledged: Icon.Alarm,
          triggered: Icon.AlarmRinging,
        }[incident.status],
        tintColor: {
          resolved: Color.Green,
          acknowledged: Color.Yellow,
          triggered: Color.Red,
        }[incident.status],
      }}
    />
  );
}
