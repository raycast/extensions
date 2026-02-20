import { List, Action, ActionPanel, Icon, getApplications, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { AppGroup, StoredApp } from "./types";
import { addAppToGroup, removeAppFromGroup } from "./storage";

interface Props {
  group: AppGroup;
  revalidate: () => void;
}

export function SelectApps({ group, revalidate }: Props) {
  const [apps, setApps] = useState<{ name: string; bundleId: string; path: string }[]>([]);
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set(group.apps.map((a) => a.bundleId)));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getApplications().then((installed) => {
      const sorted = installed
        .filter((a) => a.bundleId)
        .map((a) => ({ name: a.name, bundleId: a.bundleId!, path: a.path }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setApps(sorted);
      setIsLoading(false);
    });
  }, []);

  async function toggleApp(app: { name: string; bundleId: string; path: string }) {
    const isSelected = selectedBundleIds.has(app.bundleId);

    if (isSelected) {
      await removeAppFromGroup(group.id, app.bundleId);
      setSelectedBundleIds((prev) => {
        const next = new Set(prev);
        next.delete(app.bundleId);
        return next;
      });
      await showToast({ style: Toast.Style.Success, title: `Removed ${app.name}` });
    } else {
      const storedApp: StoredApp = { name: app.name, bundleId: app.bundleId, path: app.path };
      await addAppToGroup(group.id, storedApp);
      setSelectedBundleIds((prev) => new Set(prev).add(app.bundleId));
      await showToast({ style: Toast.Style.Success, title: `Added ${app.name}` });
    }

    revalidate();
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Apps in ${group.name}`} searchBarPlaceholder="Search apps...">
      {apps.map((app) => {
        const isSelected = selectedBundleIds.has(app.bundleId);
        return (
          <List.Item
            key={app.bundleId}
            icon={{ fileIcon: app.path }}
            title={app.name}
            accessories={isSelected ? [{ icon: Icon.Checkmark }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Remove from Group" : "Add to Group"}
                  icon={isSelected ? Icon.Minus : Icon.Plus}
                  onAction={() => toggleApp(app)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
