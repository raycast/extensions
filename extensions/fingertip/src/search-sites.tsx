import { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Detail,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  Color,
} from "@raycast/api";
import { sentenceCase } from "change-case";
import { useFetch } from "@raycast/utils";
import { Fingertip } from "fingertip/client";

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      return `https://api.fingertip.com/v1/sites?${new URLSearchParams({ search: searchText, ...(options?.cursor ? { cursor: options?.cursor } : {}) }).toString()}`;
    },
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
        "Content-Type": "application/json",
      },
      keepPreviousData: true,
      initialData: [],
      onError: (error) => {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load sites",
          message: error.message || "Unknown error occurred",
        });
      },
      mapResult(result: Fingertip.V1.Sites.SiteListResponsesMyCursorPage) {
        const {
          items,
          pageInfo: { endCursor, hasNextPage },
        } = result;
        return { data: items, hasMore: hasNextPage, cursor: endCursor };
      },
    },
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!preferences.apiKey) {
    return (
      <Detail
        markdown="# Setup Required\n\nPlease add your Fingertip API key in the extension preferences.\n\nYou can generate an API key at [fingertip.com/account/api](https://fingertip.com/account/api)."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Get Api Key" url="https://fingertip.com/account/api" icon={Icon.Key} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sites by name or slug..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      throttle
    >
      <List.Section title="Recently Updated">
        {data.map((site, index) => (
          <List.Item
            key={`${site.id}-${index}`}
            id={site.id}
            title={site.name}
            subtitle={site.slug}
            accessories={[
              {
                tag: {
                  value: sentenceCase(site?.status || ""),
                  color: site.status === "ENABLED" ? Color.Green : Color.SecondaryText,
                },
              },
              { date: new Date(site.updatedAt), tooltip: `Last updated: ${formatDate(site.updatedAt)}` },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://fingertip.com/sites/${site.slug}`} title="Home" icon={Icon.House} />
                <Action.OpenInBrowser url={`https://fingertip.com/${site.slug}`} title="Open Site" icon={Icon.Link} />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/pages`}
                  title="Pages"
                  icon={Icon.Document}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/calendar`}
                  title="Scheduling"
                  icon={Icon.Calendar}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/contacts`}
                  title="Contacts"
                  icon={Icon.TwoPeople}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/invoices`}
                  title="Invoicing"
                  icon={Icon.Coins}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/forms`}
                  title="Forms"
                  icon={Icon.Clipboard}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/products`}
                  title="Products"
                  icon={Icon.Cart}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/blog`}
                  title="Blog"
                  icon={Icon.Pencil}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/analytics`}
                  title="Analytics"
                  icon={Icon.BarChart}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/settings`}
                  title="Settings"
                  icon={Icon.Cog}
                />
                <Action.CopyToClipboard content={`https://fingertip.com/${site.slug}`} title="Copy Site URL" />
                <Action.CopyToClipboard content={site.slug} title="Copy Site Slug" />
                <Action.CopyToClipboard content={site.id} title={`Copy Site ID`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
