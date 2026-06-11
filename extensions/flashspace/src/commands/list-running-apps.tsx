import { Action, ActionPanel, closeMainWindow, getApplications, Icon, List, showHUD } from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { getFlashspacePath, parseRunningApps } from "../utils/cli";
import { getAppIcon, openApplicationAsync } from "../utils/apps";

export default function ListRunningApps() {
  const flashspace = getFlashspacePath();

  const { isLoading, data, revalidate } = useExec(flashspace, ["list-running-apps", "--with-bundle-id"], {
    parseOutput: ({ stdout }) => parseRunningApps(stdout),
    failureToastOptions: { title: "Failed to list running apps" },
  });

  const { data: installedApps } = usePromise(getApplications);

  async function focusApp(app: { name: string; bundleId?: string }) {
    try {
      await openApplicationAsync(app, installedApps);
      await closeMainWindow();
    } catch {
      await showHUD(`Failed to focus "${app.name}"`);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running apps...">
      {data?.map((app) => (
        <List.Item
          key={app.bundleId || app.name}
          title={app.name}
          subtitle={app.bundleId}
          icon={getAppIcon(installedApps, app)}
          actions={
            <ActionPanel>
              <Action title="Focus App" icon={Icon.Eye} onAction={() => focusApp(app)} />
              <Action.CopyToClipboard title="Copy App Name" content={app.name} />
              {app.bundleId && <Action.CopyToClipboard title="Copy Bundle ID" content={app.bundleId} />}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
