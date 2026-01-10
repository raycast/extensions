/**
 * Manage Plugin Marketplaces command
 */

import React from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  showToast,
  Toast,
  Alert,
  Color,
} from "@raycast/api";
import { useMarketplaces } from "./hooks/useMarketplaces";
import {
  removeMarketplace,
  updateMarketplace,
  openInFinder,
  openInVSCode,
} from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";
import AddMarketplace from "./add-marketplace";
import { ErrorView } from "./components/ErrorView";
import { Marketplace } from "./lib/types";

export default function Marketplaces() {
  const { marketplaces, isLoading, error, refetch } = useMarketplaces();

  if (error) {
    return <ErrorView error={error} />;
  }

  async function handleUpdate(name: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating marketplace...",
    });
    try {
      const result = await updateMarketplace(name);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Marketplace updated";
        invalidateCache(CACHE_KEYS.MARKETPLACES);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        console.error("Update marketplace failed:", result.error);
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = result.error?.slice(0, 200);
      }
    } catch (err: unknown) {
      console.error("Update marketplace exception:", err);
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handleUpdateAll() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating all marketplaces...",
    });
    try {
      const result = await updateMarketplace();
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "All marketplaces updated";
        invalidateCache(CACHE_KEYS.MARKETPLACES);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = result.error;
      }
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handleRemove(name: string) {
    if (
      await confirmAlert({
        title: "Remove Marketplace",
        message: `Are you sure you want to remove ${name}?`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing marketplace...",
      });
      try {
        const result = await removeMarketplace(name);
        if (result.success) {
          toast.style = Toast.Style.Success;
          toast.title = "Marketplace removed";
          invalidateCache(CACHE_KEYS.MARKETPLACES);
          invalidateCache(CACHE_KEYS.ALL_PLUGINS);
          refetch();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Remove failed";
          toast.message = result.error;
        }
      } catch (err: unknown) {
        toast.style = Toast.Style.Failure;
        toast.title = "Remove failed";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  function getSourceDescription(marketplace: Marketplace): string {
    if (marketplace.source.type === "github") {
      return `GitHub: ${marketplace.source.repo}`;
    } else if (marketplace.source.type === "directory") {
      return `Directory: ${marketplace.source.path}`;
    } else if (marketplace.source.type === "git") {
      return `Git: ${marketplace.source.url}`;
    } else if (marketplace.source.type === "url") {
      return `URL: ${marketplace.source.url}`;
    }
    return marketplace.source.type;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search marketplaces..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Marketplace"
            icon={Icon.Plus}
            target={<AddMarketplace onAdded={refetch} />}
          />
        </ActionPanel>
      }
    >
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            id="add-new-marketplace"
            title="Add New Marketplace"
            icon={Icon.Plus}
            accessories={[{ tag: { value: "Action", color: Color.Blue } }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Marketplace"
                  icon={Icon.Plus}
                  target={<AddMarketplace onAdded={refetch} />}
                />
                <Action
                  title="Update All Marketplaces"
                  icon={Icon.ArrowClockwise}
                  onAction={handleUpdateAll}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {marketplaces.length > 0 && (
        <List.Section title={`Marketplaces (${marketplaces.length})`}>
          {marketplaces.map((marketplace) => (
            <List.Item
              id={marketplace.name}
              title={marketplace.name}
              subtitle={getSourceDescription(marketplace)}
              accessories={[
                {
                  text: new Date(marketplace.lastUpdated).toLocaleDateString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Management">
                    <Action
                      title="Update Marketplace"
                      icon={Icon.ArrowClockwise}
                      onAction={() => handleUpdate(marketplace.name)}
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                    />
                    <Action
                      title="Remove Marketplace"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemove(marketplace.name)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Development">
                    <Action
                      title="Open in Finder"
                      icon={Icon.Finder}
                      onAction={() => openInFinder(marketplace.installLocation)}
                    />
                    <Action
                      title="Open in VS Code"
                      icon={Icon.Code}
                      onAction={() => openInVSCode(marketplace.installLocation)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Other">
                    <Action.Push
                      title="Add New Marketplace"
                      icon={Icon.Plus}
                      target={<AddMarketplace onAdded={refetch} />}
                    />
                    <Action
                      title="Update All Marketplaces"
                      icon={Icon.ArrowClockwise}
                      onAction={handleUpdateAll}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Marketplace Name"
                      content={marketplace.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Install Location"
                      content={marketplace.installLocation}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {marketplaces.length === 0 && !isLoading && (
        <List.EmptyView
          title="No marketplaces configured"
          description="Add a marketplace to browse and install plugins"
          icon={Icon.Box}
        />
      )}
    </List>
  );
}
