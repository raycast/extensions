import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import AppShortcuts from "./app-shortcuts";
import useAllShortcuts from "./load/shortcuts-provider";
import { removeHiddenBundleId } from "./model/internal/bundle-id-remover";
import { getAvatarIcon, useFrecencySorting } from "@raycast/utils";

export default function AllShortcutsCommand() {
  const { push } = useNavigation();
  const { isLoading, shortcuts } = useAllShortcuts();
  const {
    data: sortedApplications,
    visitItem,
  } = useFrecencySorting(shortcuts.applications, {
    key: (app) => app.name,
  });
  return (
    <List isLoading={isLoading}>
      {sortedApplications.map((app) => {
        return (
          <List.Item
            key={app.bundleId}
            icon={getAvatarIcon(app.name)}
            title={app.name}
            subtitle={removeHiddenBundleId(app.bundleId)}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  onAction={async () => {
                    await visitItem(app);
                    push(<AppShortcuts bundleId={app.bundleId} />);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
