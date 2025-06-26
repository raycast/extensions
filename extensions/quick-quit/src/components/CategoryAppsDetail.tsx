import { ActionPanel, Action, List, Application, Icon } from "@raycast/api";
import { useMemo } from "react";

interface CategoryAppListProps {
  categoryName: string;
  apps: { bundleId: string; name: string }[]; // Changed!
  allApps: Application[];
}

export function CategoryAppList({ categoryName, apps, allApps }: CategoryAppListProps) {
  const { installed, notInstalled } = useMemo(() => {
    const installedList: Application[] = [];
    const notInstalledList: { bundleId: string; name: string }[] = [];

    apps.forEach((prebuiltApp) => {
      const foundApp = allApps.find((installedApp) => installedApp.bundleId === prebuiltApp.bundleId);
      if (foundApp) {
        installedList.push(foundApp);
      } else {
        notInstalledList.push(prebuiltApp);
      }
    });
    return { installed: installedList, notInstalled: notInstalledList };
  }, [apps, allApps]);

  return (
    <List navigationTitle={`${categoryName} Apps`}>
      {installed.length > 0 && (
        <List.Section title="Installed">
          {installed.map((app) => (
            <List.Item
              key={app.path}
              title={app.name}
              icon={{ fileIcon: app.path }}
              actions={
                <ActionPanel>
                  <Action.Open title="Open Application" target={app.path} />
                  <Action.ShowInFinder path={app.path} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {notInstalled.length > 0 && (
        <List.Section title="Not Installed">
          {notInstalled.map((app) => (
            <List.Item
              key={app.bundleId}
              title={app.name}
              icon={Icon.QuestionMark}
              // subtitle={app.bundleId}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
