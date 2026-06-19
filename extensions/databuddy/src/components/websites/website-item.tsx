import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { DASHBOARD_URL, deleteWebsite, fetchSummary } from "../../api";
import type { DatePreset, Website } from "../../types";
import { bounceColor, dur, fmt } from "../../lib/utils";
import { EditWebsite } from "./edit-website";
import { WebsiteAnalytics } from "./website-analytics";

export function WebsiteItem({ site, preset, onMutate }: { site: Website; preset: DatePreset; onMutate: () => void }) {
  const { data, isLoading, error } = useCachedPromise(fetchSummary, [site.id, preset], { keepPreviousData: true });
  const websiteDashboardUrl = `${DASHBOARD_URL}/websites/${site.id}`;

  async function handleDelete() {
    if (
      await confirmAlert({
        title: `Delete ${site.name}?`,
        message: `This will permanently remove ${site.domain} and all its analytics data.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting website…" });
      try {
        await deleteWebsite(site.id);
        toast.style = Toast.Style.Success;
        toast.title = "Website deleted";
        onMutate();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete website";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  return (
    <List.Item
      id={site.id}
      icon={getFavicon(`https://${site.domain}`, { fallback: Icon.Globe })}
      title={site.name}
      subtitle={site.domain}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              {error && (
                <List.Item.Detail.Metadata.Label
                  title="Error"
                  text={{ value: "Failed to load analytics", color: Color.Red }}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Visitors"
                text={data ? { value: fmt(data.unique_visitors), color: Color.Blue } : "–"}
                icon={{ source: Icon.Person, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Page Views"
                text={data ? { value: fmt(data.pageviews), color: Color.Purple } : "–"}
                icon={{ source: Icon.Eye, tintColor: Color.Purple }}
              />
              <List.Item.Detail.Metadata.Label
                title="Sessions"
                text={data ? { value: fmt(data.sessions), color: Color.Green } : "–"}
                icon={{ source: Icon.TwoPeople, tintColor: Color.Green }}
              />
              <List.Item.Detail.Metadata.Separator />
              {data ? (
                <List.Item.Detail.Metadata.TagList title="Bounce Rate">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`${Math.round(data.bounce_rate)}%`}
                    color={bounceColor(data.bounce_rate)}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : (
                <List.Item.Detail.Metadata.Label title="Bounce Rate" text="–" />
              )}
              <List.Item.Detail.Metadata.Label
                title="Session Duration"
                text={data ? dur(data.median_session_duration) : "–"}
                icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Dashboard" text="Open in Databuddy" target={websiteDashboardUrl} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Analytics"
            icon={Icon.BarChart}
            target={<WebsiteAnalytics site={site} preset={preset} />}
          />
          <Action.Push
            title="Edit Website"
            icon={Icon.Pencil}
            target={<EditWebsite site={site} onUpdate={onMutate} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.OpenInBrowser title="Open in Databuddy" url={websiteDashboardUrl} />
          <Action.OpenInBrowser
            title="Open Website"
            url={`https://${site.domain}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Domain"
            content={site.domain}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Website ID"
            content={site.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action
            title="Delete Website"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
