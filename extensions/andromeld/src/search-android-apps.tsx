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
const ANDROMELD_URL = "https://andromeld.catchingnow.com";

type AndroidApp = {
  name: string;
  keywords?: string[];
  packageName: string;
  userId: number;
  deviceSerial: string;
  deviceName: string;
  iconPath?: string;
  url: string;
};

// A missing catalog file means AndroMeld for Mac has never run, which needs different guidance
// than a catalog that exists but lists no apps because no device is connected.
type Catalog = { published: false } | { published: true; apps: AndroidApp[] };

function isAndroidApp(value: unknown): value is AndroidApp {
  const app = value as Partial<AndroidApp> | null;
  return (
    typeof app?.name === "string" &&
    typeof app.packageName === "string" &&
    typeof app.url === "string" &&
    typeof app.deviceSerial === "string" &&
    typeof app.deviceName === "string" &&
    typeof app.userId === "number"
  );
}

async function readCatalog(): Promise<Catalog> {
  const path = APP_GROUPS.map((group) => join(homedir(), "Library/Group Containers", group, CATALOG_FILE)).find(
    existsSync,
  );
  if (!path) {
    return { published: false };
  }

  // AndroMeld rewrites the catalog in place, so a read can land on a half-written file. Both the
  // parse and the shape check throw so the failure surfaces as its own empty state rather than
  // crashing the command or showing an empty list that looks like a disconnected device.
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  const apps = (parsed as { apps?: unknown } | null)?.apps;
  if (!Array.isArray(apps)) {
    throw new Error("The catalog file does not contain an app list.");
  }
  return { published: true, apps: apps.filter(isAndroidApp) };
}

function AndroMeldAction() {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Andromeld Website" url={ANDROMELD_URL} />
    </ActionPanel>
  );
}

function EmptyState({ catalog, error }: { catalog?: Catalog; error?: Error }) {
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Couldn't Read the App Catalog"
        description={`${error.message} Restarting AndroMeld for Mac rewrites it.`}
        actions={<AndroMeldAction />}
      />
    );
  }

  if (catalog && !catalog.published) {
    return (
      <List.EmptyView
        icon={Icon.Download}
        title="AndroMeld for Mac Not Found"
        description="This command lists the apps published by AndroMeld for Mac. Install it and connect an Android device to get started."
        actions={<AndroMeldAction />}
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.Mobile}
      title="No Android Apps Yet"
      description="Connect an Android device in AndroMeld for Mac, then try again."
      actions={<AndroMeldAction />}
    />
  );
}

export default function Command() {
  const { data, error, isLoading } = usePromise(readCatalog, []);
  const apps = data?.published ? data.apps : [];

  return (
    <List isLoading={isLoading}>
      {!isLoading && <EmptyState catalog={data} error={error} />}
      {apps.map((app) => (
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
