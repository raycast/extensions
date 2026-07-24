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
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Link, U2L, U2LApiError } from "@u2l/sdk";

interface Preferences {
  apiKey: string;
}

function shortLinkOf(link: Link): string {
  return link.shortLink || `https://${link.domain}/${link.slug}`;
}

function LinkDetail({ link }: { link: Link }) {
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
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Domain" text={link.domain} />
          <Detail.Metadata.Label title="Slug" text={link.slug} />
          <Detail.Metadata.Label title="Type" text={link.type === "QR" ? "QR code" : "Short link"} />
          <Detail.Metadata.Label title="Clicks" text={String(link.clicks ?? 0)} />
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
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Short Link" content={shortLink} />
          <Action.OpenInBrowser title="Open Short Link" url={shortLink} />
          {link.destination ? <Action.OpenInBrowser title="Open Destination" url={link.destination} /> : null}
        </ActionPanel>
      }
    />
  );
}

export default function SearchLinks() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const client = useMemo(() => new U2L({ apiKey }), [apiKey]);
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, revalidate } = useCachedPromise(
    async (search: string) => {
      const page = await client.links.list({
        search: search || undefined,
        limit: 50,
        sort: "createdAt",
        order: "desc",
      });
      return page.links;
    },
    [searchText],
    { keepPreviousData: true },
  );

  async function deleteLink(link: Link) {
    const confirmed = await confirmAlert({
      title: "Delete Link?",
      message: `${shortLinkOf(link)} stops working immediately. This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await client.links.delete(link.domain, link.slug);
      await showToast({ style: Toast.Style.Success, title: "Link deleted" });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete",
        message: error instanceof U2LApiError ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your links…" onSearchTextChange={setSearchText} throttle>
      <List.EmptyView
        icon={Icon.Link}
        title={searchText ? "No links match" : "No links yet"}
        description={searchText ? "Try a different search." : "Use the Shorten Link command to create your first one."}
      />
      {(data ?? []).map((link) => (
        <List.Item
          key={`${link.domain}/${link.slug}`}
          icon={link.type === "QR" ? Icon.BarCode : Icon.Link}
          title={link.title || link.slug}
          subtitle={link.destination}
          accessories={[
            { text: `${link.clicks ?? 0} clicks` },
            ...(link.createdAt ? [{ date: new Date(link.createdAt) }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Short Link" content={shortLinkOf(link)} />
              <Action.Push title="View Details" icon={Icon.Sidebar} target={<LinkDetail link={link} />} />
              <Action.OpenInBrowser
                title="Open Short Link"
                url={shortLinkOf(link)}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              {link.destination ? (
                <Action.OpenInBrowser
                  title="Open Destination"
                  url={link.destination}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                />
              ) : null}
              <Action
                title="Delete Link"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => deleteLink(link)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
