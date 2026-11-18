import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { DASHBOARD_URL, deleteFunnel, fetchFunnels, fetchWebsites } from "./api";
import type { Funnel, Website } from "./types";
import { FunnelAnalyticsView } from "./components/funnels/funnel-analytics";

export default function Command() {
  const { data: websites, isLoading: loadingWebsites, error: websitesError } = useCachedPromise(fetchWebsites);
  const [websiteId, setWebsiteId] = useState<string>("");

  const selectedId = websiteId || websites?.[0]?.id || "";
  const {
    data: funnels,
    isLoading: loadingFunnels,
    error: funnelsError,
    revalidate,
  } = useCachedPromise(fetchFunnels, [selectedId], {
    execute: selectedId.length > 0,
    keepPreviousData: true,
  });

  const error = websitesError || funnelsError;
  if (error) {
    const isAuth = error.message.includes("Invalid API key");
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={isAuth ? "Invalid API Key" : "Failed to Load Funnels"}
          description={isAuth ? "Check your API key in extension preferences." : error.message}
          actions={
            <ActionPanel>
              {isAuth && <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />}
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function handleDelete(funnel: Funnel) {
    if (
      await confirmAlert({
        title: `Delete ${funnel.name}?`,
        message: "This will permanently remove this funnel and its analytics data.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting funnel…" });
      try {
        await deleteFunnel(funnel.id);
        toast.style = Toast.Style.Success;
        toast.title = "Funnel deleted";
        revalidate();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete funnel";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  return (
    <List
      isLoading={loadingWebsites || loadingFunnels}
      isShowingDetail
      searchBarPlaceholder="Search funnels..."
      searchBarAccessory={
        <List.Dropdown tooltip="Website" value={selectedId} onChange={(v) => setWebsiteId(v)}>
          {websites?.map((w: Website) => (
            <List.Dropdown.Item key={w.id} title={w.name} value={w.id} />
          ))}
        </List.Dropdown>
      }
    >
      {funnels?.length === 0 && (
        <List.EmptyView
          icon={Icon.Filter}
          title="No Funnels"
          description="Create a funnel in the Databuddy dashboard to track conversion flows."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create in Dashboard" url={DASHBOARD_URL} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}
      {funnels?.map((funnel) => (
        <List.Item
          key={funnel.id}
          id={funnel.id}
          icon={Icon.Filter}
          title={funnel.name}
          subtitle={`${funnel.steps.length} steps`}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={funnel.isActive ? "Active" : "Inactive"}
                      color={funnel.isActive ? Color.Green : Color.SecondaryText}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Steps" text={String(funnel.steps.length)} icon={Icon.List} />
                  {funnel.description && (
                    <List.Item.Detail.Metadata.Label title="Description" text={funnel.description} />
                  )}
                  {funnel.createdAt && (
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(funnel.createdAt).toLocaleDateString("en-US")}
                      icon={Icon.Calendar}
                    />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link title="Dashboard" text="Open in Databuddy" target={DASHBOARD_URL} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Analytics"
                icon={Icon.BarChart}
                target={<FunnelAnalyticsView funnel={funnel} />}
              />
              <Action.OpenInBrowser title="Open in Databuddy" url={DASHBOARD_URL} />
              <Action.CopyToClipboard
                title="Copy Funnel ID"
                content={funnel.id}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
              <Action
                title="Delete Funnel"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(funnel)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
