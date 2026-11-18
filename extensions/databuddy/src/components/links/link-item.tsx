import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { DASHBOARD_URL, deleteLink, fetchLinkClicks, SHORT_LINK_HOST } from "../../api";
import type { DatePreset, Link } from "../../types";
import { fmt } from "../../lib/utils";
import { EditLink } from "./edit-link";
import { LinkAnalytics } from "./link-analytics";

function targetDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function LinkItem({ link, preset, onMutate }: { link: Link; preset: DatePreset; onMutate: () => void }) {
  const { data, isLoading, error } = useCachedPromise(fetchLinkClicks, [link.id, preset], { keepPreviousData: true });

  async function handleDelete() {
    if (
      await confirmAlert({
        title: `Delete ${link.name}?`,
        message: `This will permanently remove the short link ${SHORT_LINK_HOST}/${link.slug}.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting link…" });
      try {
        await deleteLink(link.id);
        toast.style = Toast.Style.Success;
        toast.title = "Link deleted";
        onMutate();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete link";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  const shortUrl = `https://${SHORT_LINK_HOST}/${link.slug}`;
  const domain = targetDomain(link.targetUrl);

  return (
    <List.Item
      id={link.id}
      icon={domain ? getFavicon(`https://${domain}`, { fallback: Icon.Link }) : Icon.Link}
      title={link.name}
      subtitle={`/${link.slug}`}
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
                title="Total Clicks"
                text={data ? { value: fmt(data.total_clicks), color: Color.Blue } : "–"}
                icon={{ source: Icon.Mouse, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Slug" text={`/${link.slug}`} icon={Icon.Tag} />
              <List.Item.Detail.Metadata.Link title="Target" text={link.targetUrl} target={link.targetUrl} />
              <List.Item.Detail.Metadata.Link title="Short URL" text={shortUrl} target={shortUrl} />
              {link.expiresAt && (
                <List.Item.Detail.Metadata.Label
                  title="Expires"
                  text={new Date(link.expiresAt).toLocaleDateString("en-US")}
                  icon={Icon.Clock}
                />
              )}
              {link.ogTitle && <List.Item.Detail.Metadata.Label title="OG Title" text={link.ogTitle} />}
              {link.externalId && (
                <List.Item.Detail.Metadata.Label title="External ID" text={link.externalId} icon={Icon.Fingerprint} />
              )}
              {link.createdAt && (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(link.createdAt).toLocaleDateString("en-US")}
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
            target={<LinkAnalytics link={link} preset={preset} />}
          />
          <Action.Push
            title="Edit Link"
            icon={Icon.Pencil}
            target={<EditLink link={link} onUpdate={onMutate} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.OpenInBrowser title="Open in Databuddy" url={DASHBOARD_URL} />
          <Action.OpenInBrowser
            title="Open Target URL"
            url={link.targetUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Short URL"
            content={shortUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Target URL"
            content={link.targetUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
          <Action.CopyToClipboard
            title="Copy Link ID"
            content={link.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action
            title="Delete Link"
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
