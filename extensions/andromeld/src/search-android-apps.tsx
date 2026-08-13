import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// Catalog published by AndroMeld for Mac. The app rewrites it whenever the device or app list
// changes, so a plain read on command open is always current.
const CATALOG_FILE = "external-app-search-catalog.json";
const APP_GROUPS = ["group.com.catchingnow.andfiles.shared", "group.com.catchingnow.andfiles.debug.shared"];

type AndroidApp = {
  name: string;
  keywords: string[];
  packageName: string;
  userId: number;
  deviceSerial: string;
  deviceName: string;
  iconPath?: string;
  url: string;
};

async function readCatalog(): Promise<AndroidApp[]> {
  const path = APP_GROUPS.map((group) => join(homedir(), "Library/Group Containers", group, CATALOG_FILE)).find(
    existsSync,
  );
  if (!path) {
    return [];
  }
  return JSON.parse(await readFile(path, "utf8")).apps;
}

export default function Command() {
  const { data = [], isLoading } = usePromise(readCatalog, []);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No Android apps yet"
        description="Connect a device in AndroMeld for Mac, then try again."
      />
      {data.map((app) => (
        <List.Item
          key={`${app.deviceSerial}:${app.userId}:${app.packageName}`}
          icon={app.iconPath ?? Icon.Mobile}
          title={app.name}
          subtitle={app.packageName}
          keywords={app.keywords}
          accessories={[{ text: app.deviceName }]}
          actions={
            <ActionPanel>
              <Action title="Open App" icon={Icon.ArrowRight} onAction={() => open(app.url)} />
              <Action.CopyToClipboard title="Copy Package Name" content={app.packageName} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
