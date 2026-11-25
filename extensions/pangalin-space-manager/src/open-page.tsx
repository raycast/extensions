import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { openInSpaceManager } from "./app";
import { links, pages, PageSlug } from "./links";

const icons: Record<PageSlug, Icon> = {
  dashboard: Icon.PieChart,
  "free-up-space": Icon.HardDrive,
  "chat-app-media": Icon.Message,
  apps: Icon.AppWindowGrid3x3,
  history: Icon.Clock,
  "system-data": Icon.Gear,
  settings: Icon.Cog,
};

export default function Command() {
  return (
    <List searchBarPlaceholder="Search Space Manager pages">
      {pages.map((page) => (
        <List.Item
          key={page.slug}
          title={page.title}
          subtitle={page.subtitle}
          icon={icons[page.slug]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Space Manager"
                icon={Icon.ArrowRight}
                onAction={() => openInSpaceManager(links.page(page.slug))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
