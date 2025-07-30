import { Action, ActionPanel, Application, Image, List } from "@raycast/api";
import { DisplayUrl } from "../types";
import { OpenConfigFileAction } from "./open-config-action";
import { getTagAccessories, getFallbackIcon } from "../utils";
import { Icon } from "@raycast/api";

interface URLListItemProps {
  item: DisplayUrl;
  applications: Application[];
}

export function URLListItem({ item, applications }: URLListItemProps) {
  const getAppIcon = (appNameOrBundleId: string): Image.ImageLike | undefined => {
    const app = applications.find(
      (app) => app.name === appNameOrBundleId || app.bundleId === appNameOrBundleId || app.path === appNameOrBundleId,
    );
    if (app) {
      return { fileIcon: app.path };
    }
    return undefined;
  };

  const icon = item.icon || (item.openIn ? getAppIcon(item.openIn) : undefined) || getFallbackIcon(undefined, false);

  const tags = item.tags || [];
  const accessories = getTagAccessories(tags);

  return (
    <List.Item
      key={item.key}
      title={item.title}
      icon={icon}
      subtitle={item.subtitle}
      keywords={item.keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          {item.openIn ? (
            <Action.Open
              title={`Open in ${item.openIn}`}
              target={item.url}
              application={item.openIn}
              icon={getAppIcon(item.openIn) || Icon.AppWindow}
            />
          ) : (
            <Action.OpenInBrowser url={item.url} />
          )}
          <Action.CopyToClipboard content={item.url} />
          <ActionPanel.Section>
            <OpenConfigFileAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
