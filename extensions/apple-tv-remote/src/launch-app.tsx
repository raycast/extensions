import { Action, ActionPanel, Grid, Icon, LaunchType, popToRoot, showHUD } from "@raycast/api";
import { createDeeplink, usePromise } from "@raycast/utils";
import { KNOWN_APPS, loadCachedApps, refreshInstalledApps } from "./lib/apps";
import { launchApp } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { AppleTVError, showErrorToast } from "./lib/errors";

const WELL_KNOWN = Object.fromEntries(KNOWN_APPS.map((app) => [app.bundleId, app.name]));

async function open(bundleId: string, name: string) {
  try {
    await withConnection((conn) => launchApp(conn, bundleId));
    await showHUD(`Opened ${name}`);
    await popToRoot();
  } catch (error) {
    await showErrorToast(error);
  }
}

/** Installed apps, shown from cache (or the well-known list) while the live list loads. */
export default function LaunchAppCommand() {
  const { data, isLoading } = usePromise(() => withConnection(refreshInstalledApps), [], {
    onError: (error) =>
      showErrorToast(
        error instanceof AppleTVError
          ? error
          : new AppleTVError(`${error.message}. Showing well-known apps instead.`, "Couldn't Load App List"),
      ),
  });
  const apps = Object.entries(data ?? loadCachedApps() ?? WELL_KNOWN).sort(([, a], [, b]) => a.localeCompare(b));

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search Apple TV apps…">
      <Grid.EmptyView icon={Icon.AppWindow} title="No Matching Apps" description="Try a different search." />
      {apps.map(([bundleId, name]) => (
        <Grid.Item
          key={bundleId}
          content={Icon.AppWindow}
          title={name}
          subtitle={bundleId}
          actions={
            <ActionPanel>
              <Action title="Open on Apple TV" icon={Icon.Monitor} onAction={() => open(bundleId, name)} />
              {/* A saved quicklink takes its own hotkey or alias: one keystroke to any app. */}
              <Action.CreateQuicklink
                title="Save as Quicklink (Hotkey-Able)"
                quicklink={{
                  name: `Open ${name} on Apple TV`,
                  link: createDeeplink({
                    command: "ask",
                    launchType: LaunchType.Background,
                    arguments: { query: `open ${bundleId}` },
                  }),
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
