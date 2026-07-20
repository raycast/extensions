import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppendChildForm } from "./AppendChildForm";
import { QuickCaptureForm } from "./QuickCaptureForm";
import { SaveBookmarkForm } from "./SaveBookmarkForm";
import { getChildCount } from "../lib/cache";
import { listChildNodes, setNodeCompleted } from "../lib/api";
import { getPreferences } from "../lib/preferences";
import { getWorkflowyAppUrl, getWorkflowyWebUrl } from "../lib/urls";
import { truncate, type WorkflowyApiNode } from "../lib/nodes";

export interface ViewLocation {
  title: string;
  target: string;
  targetNodeId?: string | null;
  path: string;
}

interface Props {
  location: ViewLocation;
  isRoot?: boolean;
}

function getNodeIcon(node: WorkflowyApiNode): Icon {
  if (node.completedAt) return Icon.CheckCircle;
  if (node.data?.layoutMode === "todo") return Icon.Circle;
  if (node.data?.layoutMode === "h1" || node.data?.layoutMode === "h2" || node.data?.layoutMode === "h3") return Icon.Text;
  return Icon.BulletPoints;
}

export function ViewWorkflowyList({ location, isRoot = false }: Props) {
  const preferences = getPreferences();
  const opensInWeb = preferences.openWorkflowyLocationTarget === "web";
  const [items, setItems] = useState<WorkflowyApiNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const listTarget = location.targetNodeId ?? location.target;

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const children = await listChildNodes(preferences.apiKey, listTarget);
      setItems(children);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [preferences.apiKey, listTarget]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const currentDestination = useMemo(
    () => ({ title: location.title, target: location.target, targetNodeId: location.targetNodeId }),
    [location.title, location.target, location.targetNodeId],
  );

  async function toggleComplete(node: WorkflowyApiNode) {
    try {
      const nextCompleted = !node.completedAt;
      await setNodeCompleted(preferences.apiKey, node.id, nextCompleted);
      setItems((current) =>
        current.map((item) =>
          item.id === node.id
            ? {
                ...item,
                completedAt: nextCompleted ? Math.floor(Date.now() / 1000) : null,
              }
            : item,
        ),
      );
      await showToast({
        style: Toast.Style.Success,
        title: nextCompleted ? "Marked as complete" : "Marked as incomplete",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={isRoot ? undefined : location.path}
      searchBarPlaceholder={`Filter items in ${location.title}`}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Item Here"
            shortcut={{ modifiers: ["cmd"], key: "a" }}
            target={<QuickCaptureForm fixedDestination={currentDestination} onDidCreate={loadItems} returnToRootOnSuccess={false} />}
          />
          <Action title="Refresh" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadItems} />
        </ActionPanel>
      }
    >
      {errorMessage ? (
        <List.EmptyView
          title="Could not load this location"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action title="Retry" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadItems} />
              <Action.Push
                title="Add Item Here"
                shortcut={{ modifiers: ["cmd"], key: "a" }}
                target={<QuickCaptureForm fixedDestination={currentDestination} onDidCreate={loadItems} returnToRootOnSuccess={false} />}
              />
            </ActionPanel>
          }
        />
      ) : items.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No items here"
          description={location.path}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Item Here"
                shortcut={{ modifiers: ["cmd"], key: "a" }}
                target={<QuickCaptureForm fixedDestination={currentDestination} onDidCreate={loadItems} returnToRootOnSuccess={false} />}
              />
              <Action title="Refresh" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadItems} />
            </ActionPanel>
          }
        />
      ) : null}

      {items.map((node) => {
        const nodePath = location.path ? `${location.path} > ${node.name || "(Untitled)"}` : node.name || "(Untitled)";
        const childCount = getChildCount(node.id);
        const accessories: List.Item.Accessory[] = [
          { text: String(childCount), tooltip: `${childCount} child item${childCount === 1 ? "" : "s"}` },
        ];
        return (
          <List.Item
            key={node.id}
            icon={getNodeIcon(node)}
            title={node.name || "(Untitled)"}
            subtitle={node.note ? truncate(node.note, 50) : undefined}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Item"
                  target={
                    <ViewWorkflowyList
                      location={{
                        title: node.name || "(Untitled)",
                        target: node.id,
                        targetNodeId: node.id,
                        path: nodePath,
                      }}
                    />
                  }
                />
                <Action title={node.completedAt ? "Mark Incomplete" : "Mark Complete"} shortcut={{ modifiers: ["cmd"], key: "k" }} onAction={() => toggleComplete(node)} />
                <Action.Push
                  title="Add Item Here"
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  target={<QuickCaptureForm fixedDestination={currentDestination} onDidCreate={loadItems} returnToRootOnSuccess={false} />}
                />
                <Action.Push
                  title="Add Child Item"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  target={<AppendChildForm parentId={node.id} onDidCreate={loadItems} returnToRootOnSuccess={false} />}
                />
                <Action title="Refresh" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadItems} />
                {opensInWeb ? (
                  <Action.OpenInBrowser
                    title="Open in Workflowy"
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    url={getWorkflowyWebUrl(node.id)}
                  />
                ) : (
                  <Action title="Open in Workflowy" shortcut={{ modifiers: ["cmd"], key: "enter" }} onAction={() => open(getWorkflowyAppUrl(node.id))} />
                )}
                {opensInWeb ? (
                  <Action title="Open in Workflowy App" shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} onAction={() => open(getWorkflowyAppUrl(node.id))} />
                ) : (
                  <Action.OpenInBrowser
                    title="Open in Workflowy Web"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    url={getWorkflowyWebUrl(node.id)}
                  />
                )}
                <Action.Push title="Save as Bookmark" shortcut={{ modifiers: ["cmd", "shift"], key: "b" }} target={<SaveBookmarkForm nodeId={node.id} defaultName={node.name || "(Untitled)"} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
