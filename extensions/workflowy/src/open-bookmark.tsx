import { Action, ActionPanel, Alert, Icon, List, confirmAlert, open } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { QuickCaptureForm } from "./components/QuickCaptureForm";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { deleteBookmark, getChildren, listBookmarks, getAllShortcuts } from "./lib/cache";
import { getPreferences, hasApiKey } from "./lib/preferences";
import { getWorkflowyAppUrl, getWorkflowyWebUrl } from "./lib/urls";
import { maybeStartBackgroundSync } from "./lib/sync";
import { truncate } from "./lib/nodes";

export default function Command() {
  if (!hasApiKey()) {
    return <MissingApiKeyDetail />;
  }

  return <BookmarksView />;
}

function BookmarksView() {
  const [version, setVersion] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const preferences = getPreferences();
  const opensInWeb = preferences.openWorkflowyLocationTarget === "web";

  useEffect(() => {
    maybeStartBackgroundSync((event) => {
      if (event.type === "progress" && event.message) setSyncMessage(event.message);
      if (event.type === "done") {
        setSyncMessage(`Synced ${event.nodeCount ?? 0} items`);
        setVersion((current) => current + 1);
      }
    })?.catch((error) => setSyncMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  const shortcuts = useMemo(() => getAllShortcuts(), [version]);
  const bookmarks = useMemo(() => listBookmarks(), [version]);

  const renderOpenActions = (target: string) =>
    opensInWeb
      ? [
          <Action.OpenInBrowser key="open-default" title="Open in Workflowy" url={getWorkflowyWebUrl(target)} />,
          <Action key="open-app" title="Open in Workflowy App" onAction={() => open(getWorkflowyAppUrl(target))} />,
        ]
      : [
          <Action key="open-default" title="Open in Workflowy" onAction={() => open(getWorkflowyAppUrl(target))} />,
          <Action.OpenInBrowser key="open-web" title="Open in Workflowy Web" url={getWorkflowyWebUrl(target)} />,
        ];

  return (
    <List searchBarPlaceholder="Open a Workflowy shortcut or bookmark">
      {syncMessage ? <List.EmptyView title="No locations yet" description={syncMessage} /> : null}

      <List.Section title="Workflowy Shortcuts">
        {shortcuts.map((shortcut) => {
          const preview = shortcut.nodeId ? getChildren(shortcut.nodeId, 3).map((child) => child.name).join(" • ") : "";
          return (
            <List.Item
              key={`shortcut-${shortcut.name}`}
              icon={shortcut.isSystem ? Icon.Star : Icon.Bookmark}
              title={shortcut.label}
              subtitle={shortcut.name}
              accessories={preview ? [{ text: truncate(preview, 50) }] : []}
              actions={
                <ActionPanel>
                  {renderOpenActions(shortcut.nodeId ?? shortcut.name)}
                  <Action.Push
                    title="Add Item Here"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    target={<QuickCaptureForm fixedDestination={{ title: shortcut.label, target: shortcut.name, targetNodeId: shortcut.nodeId }} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="My Bookmarks">
        {bookmarks.map((bookmark) => {
          const preview = getChildren(bookmark.nodeId, 3).map((child) => child.name).join(" • ");
          return (
            <List.Item
              key={`bookmark-${bookmark.name}`}
              icon={Icon.Bookmark}
              title={bookmark.name}
              subtitle={bookmark.note ?? undefined}
              accessories={preview ? [{ text: truncate(preview, 50) }] : []}
              actions={
                <ActionPanel>
                  {renderOpenActions(bookmark.nodeId)}
                  <Action.Push
                    title="Add Item Here"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    target={<QuickCaptureForm fixedDestination={{ title: bookmark.name, target: bookmark.nodeId, targetNodeId: bookmark.nodeId }} />}
                  />
                  <Action
                    title="Delete Bookmark"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: `Delete bookmark \"${bookmark.name}\"?`,
                        icon: Icon.Trash,
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete",
                        },
                      });

                      if (!confirmed) return;
                      deleteBookmark(bookmark.name);
                      setVersion((current) => current + 1);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
