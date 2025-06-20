import { ActionPanel, Action, List, Application, Icon } from "@raycast/api";
import { useMemo } from "react";

interface CategoryAppListProps {
  categoryName: string;
  apps: string[]; // The master list of apps for this category
  allApps: Application[]; // The full list of all apps installed on the system
}

export function CategoryAppList({ categoryName, apps, allApps }: CategoryAppListProps) {
  const { installed, notInstalled } = useMemo(() => {
    const installedList: Application[] = [];
    const notInstalledList: string[] = [];

    apps.forEach((appName) => {
      const foundApp = allApps.find((installedApp) => installedApp.name === appName);
      if (foundApp) {
        installedList.push(foundApp);
      } else {
        notInstalledList.push(appName);
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
          {notInstalled.map((appName) => (
            <List.Item
              key={appName}
              title={appName}
              icon={Icon.QuestionMark}
              // subtitle="Not found on your system"
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
