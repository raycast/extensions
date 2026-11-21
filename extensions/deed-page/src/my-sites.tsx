import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { deleteSite, formatBytes, listSites, Site } from "./lib/api";
import { getOwnerToken } from "./lib/token";
import { PublishForm } from "./components/PublishForm";

async function loadSites(): Promise<{ hasToken: boolean; sites: Site[] }> {
  const token = await getOwnerToken();
  if (!token) return { hasToken: false, sites: [] };
  return { hasToken: true, sites: await listSites(token) };
}

export default function Command() {
  const { data, isLoading, revalidate, mutate } = useCachedPromise(loadSites, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load your sites" },
  });

  async function handleDelete(site: Site) {
    const confirmed = await confirmAlert({
      title: `Delete ${site.slug}?`,
      message: `${site.url} stops working right away. This cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting site…" });
    try {
      const token = await getOwnerToken();
      if (!token) throw new Error("No owner token is set.");
      await mutate(deleteSite(site.slug, token), {
        optimisticUpdate: (current) =>
          current ? { ...current, sites: current.sites.filter((s) => s.slug !== site.slug) } : current,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Site deleted";
      toast.message = site.slug;
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could not delete site" });
    }
  }

  const sites = data?.sites ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your sites">
      {data && !data.hasToken ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No sites yet"
          description="Publish a file, folder, or clipboard HTML first, or add an existing owner token in preferences."
          actions={
            <ActionPanel>
              <Action.Push
                title="Publish File or Folder"
                icon={Icon.Upload}
                target={<PublishForm onPublished={revalidate} />}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title="No sites"
          description="Sites you publish with this token show up here."
        />
      )}
      {sites.map((site) => (
        <List.Item
          key={site.slug}
          icon={site.protected ? Icon.Lock : Icon.Globe}
          title={site.slug}
          subtitle={site.url.replace(/^https:\/\//, "").replace(/\/$/, "")}
          keywords={[site.url]}
          accessories={[
            { text: site.version, tooltip: "Live version" },
            { text: formatBytes(site.bytes), tooltip: `${site.files} ${site.files === 1 ? "file" : "files"}` },
            ...(site.updated_at ? [{ date: new Date(site.updated_at), tooltip: "Last updated" }] : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={site.url} />
                <Action.CopyToClipboard title="Copy URL" content={site.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Update from File or Folder"
                  icon={Icon.Upload}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<PublishForm slug={site.slug} onPublished={revalidate} />}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Site"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(site)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
