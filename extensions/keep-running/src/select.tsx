import { Action, ActionPanel, getApplications, List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { data: apps = [], isLoading: isLoadingApps } = usePromise(getApplications);
  const {
    data: selected = [],
    isLoading: isLoadingSelected,
    mutate: reloadSelected,
    // I can't use `useCachedState` because it's not available
    // for the interval command through the LocalStorage API
  } = usePromise(async () => {
    const text = await LocalStorage.getItem("selected");
    const result = text ? JSON.parse(text as string) : [];
    return result as string[];
  });

  const selectedApps = apps.filter((app) => selected.includes(app.bundleId!));
  const unselectedApps = apps.filter((app) => !selected.includes(app.bundleId!));
  const isLoading = isLoadingApps || isLoadingSelected;

  const setSelected = async (newSelected: string[]) => {
    await LocalStorage.setItem("selected", JSON.stringify(newSelected));
    await reloadSelected();
  };

  return (
    <List searchBarPlaceholder="Search apps by name" isLoading={isLoading}>
      <List.Section title="Keep Running" subtitle="These will be automatically opened when closed">
        {selectedApps.map((app) => (
          <List.Item
            key={app.bundleId!}
            icon={{ fileIcon: app.path }}
            keywords={[app.bundleId!]}
            title={app.name}
            actions={
              <ActionPanel>
                <Action
                  icon={{ fileIcon: app.path }}
                  title={`Deselect ${app.name}`}
                  onAction={() => setSelected(selected.filter((bundleId) => bundleId !== app.bundleId!))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Applications" subtitle="Choose the ones to keep running">
        {unselectedApps.map((item) => (
          <List.Item
            key={item.bundleId!}
            icon={{ fileIcon: item.path }}
            keywords={[item.bundleId!]}
            title={item.name}
            actions={
              <ActionPanel>
                <Action
                  icon={{ fileIcon: item.path }}
                  title={`Select ${item.name}`}
                  onAction={() => setSelected([...selected, item.bundleId!])}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
