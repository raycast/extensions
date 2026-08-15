import { List, ActionPanel, Action } from "@raycast/api";

const SUPPORT_RESOURCES = [
  {
    title: "Create Support Ticket",
    url: "https://support.fastly.com/hc/en-us/requests/new",
    icon: "📝",
  },
  {
    title: "View Support Tickets",
    url: "https://support.fastly.com/hc/en-us/requests",
    icon: "📋",
  },
  {
    title: "Knowledge Base",
    url: "https://support.fastly.com/s/",
    icon: "📚",
  },
  {
    title: "Status Page",
    url: "https://www.fastlystatus.com/",
    icon: "🟢",
  },
  {
    title: "Community Forum",
    url: "https://community.fastly.com",
    icon: "👥",
  },
];

export default function Support() {
  return (
    <List>
      {SUPPORT_RESOURCES.map((resource) => (
        <List.Item
          key={resource.url}
          title={resource.title}
          icon={resource.icon}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={resource.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
