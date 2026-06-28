import { Action, ActionPanel, Image, List } from "@raycast/api";
import AppShortcuts from "./app-shortcuts";
import { useApps } from "./load/apps-provider";
import { getAvatarIcon, useFrecencySorting } from "@raycast/utils";
import { AppMetadata } from "./model/input/input-models";

const BASE_URL = "https://hotkys.com";

function formatSubtitle(app: AppMetadata): string {
  return app.bundleId ?? app.hostname ?? "";
}

function getAppIcon(app: AppMetadata): Image.ImageLike {
  if (!app.icon) {
    return getAvatarIcon(app.name);
  }
  if (app.icon.startsWith("http://") || app.icon.startsWith("https://")) {
    return app.icon;
  }
  return `${BASE_URL}/${app.icon.startsWith("/") ? app.icon.slice(1) : app.icon}`;
}

export default function AllShortcutsCommand() {
  const { isLoading, data: apps } = useApps();
  const { data: sortedApps, visitItem } = useFrecencySorting(apps, {
    key: (app) => app.slug,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications">
      {sortedApps.map((app) => (
        <List.Item
          key={app.slug}
          icon={getAppIcon(app)}
          title={app.name}
          subtitle={formatSubtitle(app)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Shortcuts"
                target={<AppShortcuts slug={app.slug} />}
                onPush={() => visitItem(app)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
