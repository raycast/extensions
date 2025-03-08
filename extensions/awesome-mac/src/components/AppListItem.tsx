import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { memo } from "react";
import { AppItem } from "../utils/parseReadme";

interface AppListItemProps {
  app: AppItem;
}

interface AppProperty {
  icon: { source: Icon };
  tooltip: string;
}

const getAppProperties = (app: AppItem): AppProperty[] => {
  const properties: Array<AppProperty | false> = [
    app.isOpenSource && { icon: { source: Icon.Code }, tooltip: "Open Source" },
    app.isFreeware && { icon: { source: Icon.Gift }, tooltip: "Freeware" },
    app.isAppStore && { icon: { source: Icon.AppWindow }, tooltip: "Available on App Store" },
    app.isAwesomeList && { icon: { source: Icon.StarCircle }, tooltip: "Awesome List" },
  ];

  return properties.filter(Boolean) as AppProperty[];
};

export const AppListItem = memo(function AppListItem({ app }: AppListItemProps) {
  const appProperties = getAppProperties(app);

  return (
    <List.Item
      key={app.name}
      title={app.name}
      subtitle={app.description}
      icon={getFavicon(app.url)}
      accessories={appProperties}
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
