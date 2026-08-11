import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { PageForm } from "./components";
import {
  wp,
  usePages,
  WPPage,
  getTitle,
  truncateText,
  getStatusIcon,
  getStatusLabel,
  formatRelativeDate,
  getEditPageUrl,
} from "./utils";

type PageStatus = "any" | "publish" | "draft" | "pending" | "private" | "trash";

export default function ManagePages() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<PageStatus>("any");

  const {
    data: pages,
    isLoading,
    revalidate,
  } = usePages({
    search: searchText || undefined,
    status: statusFilter === "any" ? undefined : statusFilter,
    per_page: 50,
  });

  // Build a hierarchical view with indentation
  function buildHierarchy(items: WPPage[]): Array<WPPage & { depth: number }> {
    const result: Array<WPPage & { depth: number }> = [];
    const itemMap = new Map(items.map((item) => [item.id, item]));

    function getDepth(item: WPPage, depth = 0): number {
      if (!item.parent || !itemMap.has(item.parent)) return depth;
      return getDepth(itemMap.get(item.parent)!, depth + 1);
    }

    // Sort by menu_order, then by title
    const sorted = [...items].sort((a, b) => {
      if (a.menu_order !== b.menu_order) return a.menu_order - b.menu_order;
      return getTitle(a).localeCompare(getTitle(b));
    });

    // Add depth info
    sorted.forEach((item) => {
      result.push({ ...item, depth: getDepth(item) });
    });

    return result;
  }

  const hierarchicalPages = pages ? buildHierarchy(pages) : [];

  async function handleStatusChange(page: WPPage, newStatus: "publish" | "draft" | "trash") {
    const actionName = newStatus === "publish" ? "Publishing" : newStatus === "trash" ? "Trashing" : "Saving as draft";

    await showToast({
      style: Toast.Style.Animated,
      title: `${actionName}...`,
    });

    try {
      await wp.updatePage(page.id, { status: newStatus });
      await showToast({
        style: Toast.Style.Success,
        title: newStatus === "publish" ? "Published" : newStatus === "trash" ? "Moved to trash" : "Saved as draft",
        message: getTitle(page),
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  async function handleDelete(page: WPPage) {
    const confirmed = await confirmAlert({
      title: "Delete Page Permanently?",
      message: `"${getTitle(page)}" will be permanently deleted. This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting...",
    });

    try {
      await wp.deletePage(page.id, true);
      await showToast({
        style: Toast.Style.Success,
        title: "Page deleted",
        message: getTitle(page),
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as PageStatus)}
        >
          <List.Dropdown.Item title="All Pages" value="any" />
          <List.Dropdown.Item title="Published" value="publish" />
          <List.Dropdown.Item title="Drafts" value="draft" />
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="Private" value="private" />
          <List.Dropdown.Item title="Trash" value="trash" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Document}
        title="No pages found"
        description={searchText ? "Try a different search term" : "Create your first page"}
        actions={
          <ActionPanel>
            <Action.Push title="Create Page" icon={Icon.Plus} target={<PageForm onSuccess={() => revalidate()} />} />
          </ActionPanel>
        }
      />

      {hierarchicalPages.map((page) => {
        const statusIcon = getStatusIcon(page.status);
        const indent = "  ".repeat(page.depth);
        const prefix = page.depth > 0 ? "└ " : "";

        return (
          <List.Item
            key={page.id}
            title={`${indent}${prefix}${getTitle(page)}`}
            subtitle={truncateText(page.excerpt.rendered, 50)}
            icon={Icon.Document}
            accessories={[
              page.menu_order > 0 ? { text: `#${page.menu_order}`, tooltip: "Menu Order" } : {},
              { text: formatRelativeDate(page.modified) },
              { icon: statusIcon, tooltip: getStatusLabel(page.status) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="View Page" url={page.link} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                  <Action.Push
                    title="Edit Page"
                    icon={Icon.Pencil}
                    target={<PageForm page={page} onSuccess={() => revalidate()} />}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.OpenInBrowser
                    title="Edit in Wordpress"
                    url={getEditPageUrl(page.id)}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {page.status !== "publish" && (
                    <Action
                      title="Publish"
                      icon={Icon.CheckCircle}
                      onAction={() => handleStatusChange(page, "publish")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                  )}
                  {page.status === "publish" && (
                    <Action
                      title="Unpublish (draft)"
                      icon={Icon.Circle}
                      onAction={() => handleStatusChange(page, "draft")}
                    />
                  )}
                  {page.status !== "trash" && (
                    <Action
                      title="Move to Trash"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleStatusChange(page, "trash")}
                    />
                  )}
                  {page.status === "trash" && (
                    <>
                      <Action title="Restore" icon={Icon.ArrowUp} onAction={() => handleStatusChange(page, "draft")} />
                      <Action
                        title="Delete Permanently"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(page)}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      />
                    </>
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.Push
                    title="Create Child Page"
                    icon={Icon.Plus}
                    target={<PageForm parentId={page.id} onSuccess={() => revalidate()} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={page.link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.Push
                    title="Create New Page"
                    icon={Icon.Plus}
                    target={<PageForm onSuccess={() => revalidate()} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
