import { GlazeAction } from "./components/glaze-action";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { IS_GLAZE_INSTALLED } from "./lib/paths";
import { GlazeApp } from "./lib/types";
import { getStoreInstalledApps } from "./lib/apps";
import { getAppIcon } from "./lib/icons";
import { launchApp, openStorePage, revealInFinder } from "./lib/deeplinks";
import { GlazeNotInstalled } from "./components/glaze-not-installed";
import { ProjectDetail } from "./components/project-detail";

export default function Command() {
  return IS_GLAZE_INSTALLED ? <InstalledAppsList /> : <GlazeNotInstalled />;
}

function InstalledAppsList() {
  const {
    data: apps,
    isLoading,
    revalidate,
    error,
  } = usePromise(getStoreInstalledApps);

  const actions = (
    <ActionPanel>
      <GlazeAction
        title="Browse Public Store"
        icon={Icon.Globe}
        onAction={() =>
          launchCommand({
            name: "browse-store",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <GlazeAction
        title="Refresh Installed Apps"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search installed apps..."
      actions={actions}
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.AppWindow}
        title={
          error
            ? "Couldn't Load Installed Apps"
            : apps?.length
              ? "No Matching Apps"
              : "No Apps Installed"
        }
        description={
          error
            ? error.message
            : apps?.length
              ? "Try another app name."
              : "Install apps from the Glaze Store."
        }
        actions={actions}
      />
      {!error &&
        apps?.map((app) => (
          <AppListItem key={app.id} app={app} onUninstall={revalidate} />
        ))}
    </List>
  );
}

function AppListItem({
  app,
  onUninstall,
}: {
  app: GlazeApp;
  onUninstall: () => void;
}) {
  const icon = getAppIcon(app);
  const bundlePath =
    app.bundlePath || (app.path.endsWith(".app") ? app.path : undefined);

  return (
    <List.Item
      icon={icon}
      title={app.displayName || app.name}
      subtitle={app.description}
      accessories={[{ tag: `v${app.version}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {bundlePath && (
              <GlazeAction
                title="Launch"
                icon={Icon.AppWindow}
                onAction={() => launchApp(bundlePath)}
              />
            )}
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<ProjectDetail project={app} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <GlazeAction
              title="Refresh Installed Apps"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onUninstall}
            />
            {app.storeAppId && (
              <GlazeAction
                title="View in Store"
                icon={Icon.Globe}
                onAction={() => openStorePage(app.storeAppId!)}
              />
            )}
            <GlazeAction
              title="Reveal in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => revealInFinder(app.path)}
            />
            <Action.CopyToClipboard
              title="Copy App Path"
              content={app.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <GlazeAction
              title="Uninstall"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const appPath = bundlePath || app.path;
                if (
                  await confirmAlert({
                    title: "Uninstall App",
                    message: `Are you sure you want to uninstall "${app.displayName || app.name}"?`,
                    primaryAction: {
                      title: "Uninstall",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  try {
                    await trash(appPath);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "App uninstalled",
                    });
                    onUninstall();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to uninstall",
                      message: String(error),
                    });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
