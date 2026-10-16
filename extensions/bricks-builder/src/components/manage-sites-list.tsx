import { Action, ActionPanel, Alert, confirmAlert, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ImportForm } from "./import-form";
import { LicenseActions } from "./license-form";
import { SiteForm } from "./site-form";
import { exportItems, readBackup } from "../lib/backup";
import { importSites, loadSites, removeSite, Site } from "../lib/sites";

/** The Manage Bricks Sites list; also pushed from site-based commands with ⌘⇧M. */
export function ManageSitesList() {
  const { data: sites = [], isLoading, revalidate } = usePromise(loadSites);

  const addAction = (
    <Action.Push
      title="Add Site"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SiteForm onSaved={revalidate} />}
    />
  );

  async function exportWithPasswords() {
    const confirmed = await confirmAlert({
      title: "Export with application passwords?",
      message:
        "Anyone with the file can sign in to these sites as you. Keep it somewhere safe, and delete it after importing.",
      primaryAction: { title: "Export", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await exportItems("bricks-sites", "bricks-sites-with-passwords", sites);
  }

  const backup = (
    <ActionPanel.Section>
      {sites.length > 0 && (
        <>
          <Action
            title="Export Raycast Site List"
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() =>
              exportItems(
                "bricks-sites",
                "bricks-sites",
                sites.map((site) => ({ ...site, appPassword: undefined })),
              )
            }
          />
          <Action title="Export Raycast Site List with Passwords" icon={Icon.Key} onAction={exportWithPasswords} />
        </>
      )}
      <Action.Push
        title="Import Raycast Site List"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        target={
          <ImportForm
            title="Import Raycast Site List"
            description="Choose a bricks-sites JSON file made with Export Raycast Site List. It holds your sites' Raycast settings, not their Bricks content. Sites already here (same URL) are updated and keep their saved password if the file has none."
            onImport={async (path) => {
              const { added, updated } = await importSites(await readBackup<Site>(path, "bricks-sites"));
              revalidate();
              return `Imported ${added} new, updated ${updated}`;
            }}
          />
        }
      />
    </ActionPanel.Section>
  );

  async function remove(site: Site) {
    const confirmed = await confirmAlert({
      title: `Remove ${site.name}?`,
      message: "This only removes it from Raycast.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeSite(site.id);
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sites…">
      <List.EmptyView
        icon={Icon.Globe}
        title="No Bricks sites yet"
        description="Press ↵ to add your first site, or ⌘⇧I to import a site list exported from Raycast."
        actions={
          <ActionPanel>
            {addAction}
            {backup}
          </ActionPanel>
        }
      />
      {sites.map((site) => (
        <List.Item
          key={site.id}
          icon={Icon.Globe}
          title={site.name}
          subtitle={site.url}
          accessories={[
            site.username
              ? { tag: site.username, tooltip: "Signed in with an application password" }
              : { text: "Public only" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Site"
                icon={Icon.Pencil}
                target={<SiteForm site={site} onSaved={revalidate} />}
              />
              {addAction}
              <Action.OpenInBrowser title="Open Site" url={site.url} />
              <Action
                title="Remove Site"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(site)}
              />
              {site.username && site.appPassword && <LicenseActions site={site} />}
              {backup}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
