import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getPages, getPortUrl, PortPage } from "./api/port-client";

type PageFilter = "all" | "dashboard" | "blueprint-entities";

const PAGE_TYPE_ICONS: Record<string, Icon> = {
  dashboard: Icon.AppWindowGrid3x3,
  entity: Icon.Document,
  "blueprint-entities": Icon.List,
  home: Icon.House,
  user: Icon.Person,
  team: Icon.TwoPeople,
  "users-and-teams": Icon.TwoPeople,
  "audit-log": Icon.Clock,
  "runs-history": Icon.Clock,
  run: Icon.Play,
};

function getPageIcon(page: PortPage): Icon {
  return PAGE_TYPE_ICONS[page.type] || Icon.Document;
}

function getPageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    entity: "Entity Page",
    "blueprint-entities": "Catalog",
    home: "Home",
    user: "User",
    team: "Team",
    "users-and-teams": "Users & Teams",
    "audit-log": "Audit Log",
    "runs-history": "Runs History",
    run: "Run",
  };
  return labels[type] || type;
}

function isDynamicPage(page: PortPage): boolean {
  return page.title?.includes("{{") ?? false;
}

function getDisplayTitle(page: PortPage): string {
  const title = page.title || page.identifier;
  if (isDynamicPage(page)) {
    // Extract a cleaner name from the identifier (e.g., "$team" -> "Team")
    const cleanId = page.identifier.replace(/^\$/, "");
    return cleanId.charAt(0).toUpperCase() + cleanId.slice(1);
  }
  return title;
}

export default function BrowseDashboards() {
  const [filter, setFilter] = useState<PageFilter>("all");

  const {
    data: pages,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      const allPages = await getPages();
      // Sort by title
      return allPages.sort((a, b) => (a.title || a.identifier).localeCompare(b.title || b.identifier));
    },
    [],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load pages",
          message: err.message,
        });
      },
    },
  );

  // Filter out pages that don't work as standalone dashboards
  const excludedTypes = ["entity", "user", "team", "run"];
  const validPages = pages?.filter((page) => !excludedTypes.includes(page.type) && !page.identifier.startsWith("$"));

  const filteredPages = validPages?.filter((page) => {
    if (filter === "all") return true;
    if (filter === "dashboard") return page.type === "dashboard";
    if (filter === "blueprint-entities") return page.type === "blueprint-entities";
    return true;
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load pages"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search dashboards and pages..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" value={filter} onChange={(value) => setFilter(value as PageFilter)}>
          <List.Dropdown.Item title="All Pages" value="all" />
          <List.Dropdown.Item title="Dashboards" value="dashboard" />
          <List.Dropdown.Item title="Catalogs" value="blueprint-entities" />
        </List.Dropdown>
      }
    >
      {filteredPages?.map((page) => (
        <List.Item
          key={page.identifier}
          icon={getPageIcon(page)}
          title={getDisplayTitle(page)}
          subtitle={page.identifier}
          accessories={[
            ...(isDynamicPage(page) ? [{ tag: { value: "Dynamic", color: Color.Orange } }] : []),
            { text: getPageTypeLabel(page.type) },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Port" url={getPortUrl(page)} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={getPortUrl(page)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Identifier"
                  content={page.identifier}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
