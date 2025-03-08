import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { memo } from "react";
import { AppItem } from "../utils/parseReadme";

interface AppListItemProps {
  app: AppItem;
}

export const AppListItem = memo(function AppListItem({ app }: AppListItemProps) {
  const appProperties = [
    app.isOpenSource && { icon: { source: Icon.Terminal }, tooltip: "Open Source" },
    app.isFreeware && { icon: { source: Icon.Gift }, tooltip: "Freeware" },
    app.isAppStore && { icon: { source: Icon.AppWindow }, tooltip: "Available on App Store" },
    app.isAwesomeList && { icon: { source: Icon.Star }, tooltip: "Awesome List" },
  ].filter(Boolean);

  return (
    <List.Item
      key={app.name}
      title={app.name}
      subtitle={app.description}
      icon={getFavicon(app.url)}
      accessories={appProperties}
      detail={
        <List.Item.Detail
          markdown={`# ${app.name}

${app.description || "No description available."}

## Category
${app.category}

## Links
${app.url}`}
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={app.url} icon={Icon.Globe} />
          <ActionPanel.Section title="Copy Actions">
            <Action.CopyToClipboard title="Copy URL" content={app.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard
              title="Copy App Name"
              content={app.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
});
