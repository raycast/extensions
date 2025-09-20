import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useRUM } from "./useRUM";
import { linkDomain } from "./util";

const rumApplicationIcon = (type: string) => {
  if (type == "browser") type = "javascript";

  return `https://static.datadoghq.com/static/images/logos/${type}_avatar.svg`;
};

// noinspection JSUnusedGlobalSymbols
export default function CommandListRUM() {
  const { rumApplications, isLoading } = useRUM();

  return (
    <List isLoading={isLoading}>
      {rumApplications.map(rumApplication => (
        <List.Item
          key={rumApplication.id}
          icon={{
            source: rumApplicationIcon(rumApplication.attributes.type),
            fallback: { light: "icon@light.png", dark: "icon@dark.png" },
          }}
          title={rumApplication.attributes.name}
          accessories={[{ text: rumApplication.attributes.type }]}
          keywords={[rumApplication.attributes.type]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://${linkDomain()}/rum/performance-monitoring?query=%40application.id%3A${rumApplication.id}`}
              />
              <Action.CopyToClipboard title="Copy Application ID" content={rumApplication.attributes.applicationId} />
              <Action.OpenInBrowser
                icon={Icon.LineChart}
                title="Open Performance Summary"
                url={`https://${linkDomain()}/rum/performance-monitoring?query=%40application.id%3A${rumApplication.id}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              <Action.OpenInBrowser
                icon={Icon.BarChart}
                title="Open Analytics Summary"
                url={`https://${linkDomain()}/product-analytics/summary?query=%40application.id%3A${rumApplication.id}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.OpenInBrowser
                icon={Icon.Bug}
                title="Open Error Tracking"
                url={`https://${linkDomain()}/rum/error-tracking?query=%40application.id%3A${rumApplication.id}`}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.OpenInBrowser
                icon={Icon.List}
                title="Open Sessions Explorer"
                url={`https://${linkDomain()}/rum/sessions?query=%40application.id%3A${rumApplication.id}`}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
