import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { GEARSET_COMPARE_DEPLOY_URL, GEARSET_DEPLOYMENT_HISTORY_URL } from "./navigation";

const destinations = [
  { title: "Gearset Home", subtitle: "Open the Gearset application", url: "https://app.gearset.com", icon: Icon.House },
  {
    title: "Continuous Integration",
    subtitle: "CI jobs, status, and history",
    url: "https://app.gearset.com/continuous-integration",
    icon: Icon.Repeat,
  },
  { title: "Pipelines", subtitle: "Deployment pipelines", url: "https://app.gearset.com/pipelines", icon: Icon.Link },
  {
    title: "Metadata Deployment History",
    subtitle: "Manual metadata deployments",
    url: GEARSET_DEPLOYMENT_HISTORY_URL,
    icon: Icon.Clock,
  },
  {
    title: "Compare and Deploy",
    subtitle: "Start a Gearset comparison",
    url: GEARSET_COMPARE_DEPLOY_URL,
    icon: Icon.ArrowsContract,
  },
  {
    title: "My Connections",
    subtitle: "Salesforce and source-control connections",
    url: "https://app.gearset.com/configure",
    icon: Icon.Link,
  },
  {
    title: "API Access Tokens",
    subtitle: "Manage scoped API access",
    url: "https://app.gearset.com/configure",
    icon: Icon.Key,
  },
  {
    title: "Gearset API Documentation",
    subtitle: "Automation, Reporting, and Audit API schemas",
    url: "https://api.gearset.com/public/automation/docs/index.html",
    icon: Icon.Code,
  },
] as const;

export default function OpenGearset() {
  return (
    <List searchBarPlaceholder="Search Gearset destinations…">
      {destinations.map((destination) => (
        <List.Item
          key={destination.title}
          icon={destination.icon}
          title={destination.title}
          subtitle={destination.subtitle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={`Open ${destination.title}`} url={destination.url} />
              <Action.CopyToClipboard title="Copy URL" content={destination.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
