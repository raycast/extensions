import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listSites, removeSite, renameSite } from "../lib/sites";
import { clearCache } from "../lib/cache";
import { SHORTCUTS } from "../lib/shortcuts";
import { SiteForm } from "./site-form";
import { RenameForm } from "./rename-form";

type Props = { onChange: () => void };

export function SiteList({ onChange }: Props) {
  const { push } = useNavigation();
  const { data: sites = [], isLoading, revalidate } = useCachedPromise(listSites);

  const refresh = () => {
    revalidate();
    onChange();
  };

  async function remove(id: string, label: string) {
    const confirmed = await confirmAlert({
      title: `Remove ${label}?`,
      message: "This only removes it from the list — the deployed site is untouched.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeSite(id);
    refresh();
    await showToast({ style: Toast.Style.Success, title: `Removed ${label}` });
  }

  const addAction = (
    <Action
      title="Add Site"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => push(<SiteForm onAdded={refresh} />)}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle="Manage Sites" searchBarPlaceholder="Search sites…">
      <List.EmptyView
        icon={Icon.Globe}
        title="No Sites Yet"
        description="Add the URL of a deployed open-slide site"
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {sites.map((site) => (
        <List.Item
          key={site.id}
          icon={Icon.Globe}
          title={site.label}
          subtitle={site.base}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Site" url={site.base} />
              <Action
                title="Rename"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() =>
                  push(
                    <RenameForm
                      label={site.label}
                      onSubmit={async (value) => {
                        await renameSite(site.id, value);
                        refresh();
                      }}
                    />,
                  )
                }
              />
              <Action
                title="Remove"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => remove(site.id, site.label)}
              />
              <ActionPanel.Section>
                {addAction}
                <Action
                  title="Clear Cache and Rescan"
                  icon={Icon.ArrowClockwise}
                  shortcut={SHORTCUTS.clearCache}
                  onAction={() => {
                    clearCache();
                    refresh();
                    showToast({ style: Toast.Style.Success, title: "Cache cleared" });
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
