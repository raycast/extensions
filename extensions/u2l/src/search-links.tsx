import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Link, U2L } from "@u2l/sdk";
import { API_SETTINGS_URL, isAuthError, showApiFailureToast } from "./errors";

const PAGE_SIZE = 50;

function shortLinkOf(link: Link): string {
  return link.shortLink || `https://${link.domain}/${link.slug}`;
}

function clicksLabel(clicks: number | undefined): string {
  const count = clicks ?? 0;
  return count === 1 ? "1 click" : `${count} clicks`;
}

function LinkActions({
  link,
  onDelete,
  includeDetailsAction,
}: {
  link: Link;
  onDelete: (link: Link) => boolean | Promise<boolean>;
  includeDetailsAction: boolean;
}) {
  const shortLink = shortLinkOf(link);

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Short Link" icon={Icon.Clipboard} content={shortLink} />
      {includeDetailsAction ? (
        <Action.Push title="View Details" icon={Icon.Sidebar} target={<LinkDetail link={link} onDelete={onDelete} />} />
      ) : null}
      <Action.OpenInBrowser
        title="Open Short Link"
        icon={Icon.Globe}
        url={shortLink}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      {link.destination ? (
        <Action.OpenInBrowser
          title="Open Destination"
          icon={Icon.ArrowNe}
          url={link.destination}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        />
      ) : null}
      <Action
        title="Delete Link"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => onDelete(link)}
      />
    </ActionPanel>
  );
}

function LinkDetail({ link, onDelete }: { link: Link; onDelete: (link: Link) => boolean | Promise<boolean> }) {
  const { pop } = useNavigation();
  const shortLink = shortLinkOf(link);
  const markdown = [
    `# ${link.title || link.slug}`,
    "",
    `**Short link:** ${shortLink}`,
    "",
    `**Destination:** ${link.destination || "-"}`,
  ].join("\n");

  return (
    <Detail
      navigationTitle={link.slug}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Domain" text={link.domain} />
          <Detail.Metadata.Label title="Slug" text={link.slug} />
          <Detail.Metadata.Label title="Type" text={link.type === "QR" ? "QR code" : "Short link"} />
          <Detail.Metadata.Label title="Clicks" text={clicksLabel(link.clicks)} />
          {link.createdAt ? (
            <Detail.Metadata.Label title="Created" text={new Date(link.createdAt).toLocaleString()} />
          ) : null}
          {link.tags && link.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {link.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <LinkActions
          link={link}
          includeDetailsAction={false}
          onDelete={async (item) => {
            const deleted = await onDelete(item);
            if (deleted) pop();
            return deleted;
          }}
        />
      }
    />
  );
}

export default function SearchLinks() {
  const { apiKey } = getPreferenceValues<Preferences.SearchLinks>();
  const client = useMemo(() => new U2L({ apiKey }), [apiKey]);
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, error, pagination, mutate } = useCachedPromise(
    (search: string) => async (options: { page: number }) => {
      const page = options.page + 1;
      const result = await client.links.list({
        search: search || undefined,
        limit: PAGE_SIZE,
        page,
        sort: "createdAt",
        order: "desc",
      });
      const hasMore =
        typeof result.total === "number" ? page * PAGE_SIZE < result.total : result.links.length === PAGE_SIZE;
      return { data: result.links, hasMore };
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: (caught) => {
        void showApiFailureToast(caught, "Could not load links");
      },
    },
  );

  async function deleteLink(link: Link): Promise<boolean> {
    const confirmed = await confirmAlert({
      title: "Delete Link?",
      message: `${shortLinkOf(link)} stops working immediately. This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return false;
    try {
      await mutate(client.links.delete(link.domain, link.slug), {
        optimisticUpdate(links) {
          return (links ?? []).filter((item) => item.domain !== link.domain || item.slug !== link.slug);
        },
      });
      await showToast({ style: Toast.Style.Success, title: "Link deleted" });
      return true;
    } catch (caught) {
      await showApiFailureToast(caught, "Could not delete");
      return false;
    }
  }

  const authFailed = isAuthError(error);
  const emptyTitle = authFailed
    ? "Invalid API Key"
    : error
      ? "Could not load links"
      : searchText
        ? "No links match"
        : "No links yet";
  const emptyDescription = authFailed
    ? "Create a key at u2l.ai, Settings, API, then paste it in the extension preferences."
    : error
      ? error.message
      : searchText
        ? "Try a different search."
        : "Use the Shorten Link command to create your first one.";

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search your links…"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Link}
        title={emptyTitle}
        description={emptyDescription}
        actions={
          authFailed ? (
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Open API Settings" url={API_SETTINGS_URL} />
            </ActionPanel>
          ) : undefined
        }
      />
      {(data ?? []).map((link) => (
        <List.Item
          key={`${link.domain}/${link.slug}`}
          icon={link.type === "QR" ? Icon.BarCode : Icon.Link}
          title={link.title || link.slug}
          subtitle={link.destination}
          accessories={[
            { text: clicksLabel(link.clicks) },
            ...(link.createdAt ? [{ date: new Date(link.createdAt) }] : []),
          ]}
          actions={<LinkActions link={link} onDelete={deleteLink} includeDetailsAction />}
        />
      ))}
    </List>
  );
}
