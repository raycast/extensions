import React, { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  OpenInBrowserAction,
  Action,
  getPreferenceValues,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import type { Site, Preferences } from "./types";
import { AddSitesForm } from "./addsite";
import { ImportSitesForm } from "./importsites";
import { ExportSitesForm } from "./exportsites";
import { loadSites, saveSites, getCategories } from "./utils";

export default function DailySites() {
  const { xmlFolder } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [mode, setMode] = useState<"list" | "add" | "import" | "export">("list");
  const [editingSite, setEditingSite] = useState<Site | undefined>();

  async function refresh() {
    try {
      const loaded = await loadSites();
      setSites(loaded);
      setCategories(getCategories(loaded));
    } catch (error) {
      console.error("Error loading sites:", error);
      await showToast(Toast.Style.Failure, "Failed to load sites");
    }
  }

  // if the user hasn’t yet set XML folder, show the “welcome” screen:
  if (!xmlFolder) {
    return <List.EmptyView icon="🔽" title="Welcome to Daily Sites" />;
  }

  useEffect(() => {
    // kick off loading, then clear spinner as soon as done
    refresh().then(() => setIsLoading(false));
  }, []);

  async function handleDelete(site: Site) {
    const confirmed = await confirmAlert({
      title: "Delete Site?",
      message: `Are you sure you want to delete “${site.name}”?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });
    if (!confirmed) return;

    const updated = sites.filter((s) => s.url !== site.url);

    try {
      await saveSites(updated);
      setSites(updated);
      setCategories(getCategories(updated));
      await showToast(Toast.Style.Success, "Site deleted");
    } catch (error) {
      console.error("handleDelete error:", error);
      showFailureToast(error, { title: "Error deleting site" });
    }
  }

  // Delete all sites
  async function handleDeleteAll() {
    const confirmed = await confirmAlert({
      title: "Delete All Sites?",
      message: "This will remove every site from your list.",
      primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });
    if (!confirmed) {
      return;
    }

    try {
      await saveSites([]);
      setSites([]);
      setCategories([]);
      await showToast(Toast.Style.Success, "All sites deleted");
    } catch (error) {
      console.error("handleDeleteAll error:", error);
      await showToast(Toast.Style.Failure, "Error deleting all sites");
    }
  }

  if (mode !== "list") {
    if (mode === "add" || editingSite) {
      return (
        <AddSitesForm
          initialValues={editingSite}
          onDone={async () => {
            setEditingSite(undefined);
            setMode("list");
            await refresh();
          }}
        />
      );
    }
    if (mode === "import") {
      return (
        <ImportSitesForm
          onDone={async () => {
            setMode("list");
            await refresh();
          }}
        />
      );
    }
    return <ExportSitesForm onDone={() => setMode("list")} />;
  }

  const filtered = filterCategory ? sites.filter((s) => s.category === filterCategory) : sites;

  // strip protocol, www. and trailing slash
  const displayUrl = (url: string) =>
    url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

  return (
    <List
      isLoading={sites.length > 0 && isLoading}
      searchBarPlaceholder="Filter by name, URL or category…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by category" value={filterCategory} onChange={setFilterCategory}>
          <List.Dropdown.Item title="All Categories" value="" />
          {categories
            .filter((cat) => cat !== "uncategorized")
            .map((cat) => (
              <List.Dropdown.Item key={cat} title={cat} value={cat} />
            ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Your Sites">
        {filtered.map((site) => (
          <List.Item
            key={site.url}
            title={site.name}
            subtitle={displayUrl(site.url)}
            icon={getFavicon(site.url)}
            accessoryTitle={site.category !== "uncategorized" ? site.category : undefined}
            accessoryIcon={site.category !== "uncategorized" ? Icon.Tag : undefined}
            keywords={site.category ? [site.category] : []}
            actions={
              <ActionPanel>
                <OpenInBrowserAction url={site.url} />
                <Action
                  title="Open All Filtered Sites in Browser"
                  icon={Icon.Globe}
                  onAction={async () => {
                    for (const s of filtered) {
                      await open(s.url);
                    }
                  }}
                />

                <Action.CopyToClipboard title="Copy URL" content={site.url} />
                <Action.Push
                  title="Edit Site"
                  icon={Icon.Pencil}
                  target={
                    <AddSitesForm
                      initialValues={site}
                      onDone={async () => {
                        setEditingSite(undefined);
                        setMode("list");
                        await refresh();
                      }}
                    />
                  }
                />
                <Action
                  title="Delete Site"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(site)}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          title="Manage Sites"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Add Site" icon={Icon.Plus} onAction={() => setMode("add")} />
              <Action title="Import Sites" icon={Icon.Upload} onAction={() => setMode("import")} />
              <Action title="Export Sites" icon={Icon.Download} onAction={() => setMode("export")} />
              <Action
                title="Delete All Sites"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDeleteAll}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
