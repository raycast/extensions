import { Action, ActionPanel, Icon, List, getApplications, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getExcludedApps, removeExcludedApp } from "./excluded-apps";

export default function ManageExcluded() {
  const { data: excluded, isLoading: excludeLoading, revalidate } = usePromise(getExcludedApps);
  const { data: apps, isLoading: appsLoading } = usePromise(getApplications);

  const excludedApps = useMemo(() => {
    if (!excluded || !apps) return [];
    const appMap = new Map(apps.filter((a) => a.bundleId).map((a) => [a.bundleId!, a] as const));
    return excluded.map((bundleId) => ({
      bundleId,
      app: appMap.get(bundleId),
    }));
  }, [excluded, apps]);

  return (
    <List isLoading={excludeLoading || appsLoading}>
      {excludedApps.length === 0 && !excludeLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Excluded Apps"
          description="Apps you exclude from the switcher will appear here"
        />
      ) : (
        excludedApps.map(({ bundleId, app }) => (
          <List.Item
            key={bundleId}
            icon={app ? { fileIcon: app.path } : Icon.AppWindow}
            title={app?.name || bundleId}
            subtitle={bundleId}
            actions={
              <ActionPanel>
                <Action
                  title="Remove from Excluded"
                  icon={Icon.Undo}
                  onAction={async () => {
                    await removeExcludedApp(bundleId);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "App restored",
                    });
                    revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
