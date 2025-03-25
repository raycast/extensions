import { Action, ActionPanel, getPreferenceValues, Icon, List, openCommandPreferences } from "@raycast/api";
import { getLogs } from "./libs/api";
import { getDeviceTag, getIconById, getStatusTag } from "./libs/utils";
import { Log } from "./types";
import AddDomainAction from "./components/actions/add-domain";

export default function Logs() {
  const { data, isLoading, revalidate, pagination } = getLogs();
  const { hideDeviceNames } = getPreferenceValues<Preferences.Logs>();

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data.map((log: Log) => {
        const date = new Date(log.timestamp);
        const domainParts = log.domain.split(".");
        const subdomains = domainParts.slice(0, -1).map((_, index) => domainParts.slice(index).join("."));

        return (
          <List.Item
            title={log.domain}
            icon={getIconById(log.domain)}
            accessories={[
              { tag: getStatusTag(log.status) },
              ...(hideDeviceNames ? [] : [getDeviceTag(log.device)]),
              { date: date, tooltip: date.toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action title="Reload" icon={Icon.RotateClockwise} onAction={revalidate} />
                <ActionPanel.Section title="Add to Allowlist">
                  {subdomains.map((subdomain) => (
                    <AddDomainAction domain={subdomain} type="allow" />
                  ))}
                </ActionPanel.Section>
                <ActionPanel.Section title="Add to Denylist">
                  {subdomains.map((subdomain) => (
                    <AddDomainAction domain={subdomain} type="deny" />
                  ))}
                </ActionPanel.Section>
                <Action
                  title="Open Command Preferences"
                  onAction={openCommandPreferences}
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
