import { useState, useEffect } from "react";
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
} from "@raycast/api";
import Fingertip from "fingertip";
import { sentenceCase } from "change-case";
import "node-fetch-native/polyfill";

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [showSettings, setShowSettings] = useState(!preferences.apiKey);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allSites, setAllSites] = useState<Fingertip.API.V1.V1ListSitesResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);

  // Initialize Fingertip client
  const client = new Fingertip({
    apiKey: preferences.apiKey,
  });

  // Function to fetch sites using the Fingertip client
  const fetchSites = async () => {
    if (!preferences.apiKey) return;

    setIsLoading(true);
    try {
      const response = await client.api.v1.listSites({
        cursor,
      });

      if (cursor) {
        // Create a unique set of sites by id to prevent duplicates
        setAllSites((prevSites) => {
          const existingIds = new Set(prevSites.map((site) => site.id));
          const newSites = response.items.filter((site) => !existingIds.has(site.id));
          return [...prevSites, ...newSites];
        });
      } else {
        setAllSites(response.items);
      }

      setHasNextPage(response?.pageInfo?.hasNextPage || false);
      setEndCursor(response.pageInfo.endCursor);
    } catch (error) {
      console.error("Error fetching sites:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sites",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });

      if (error instanceof Fingertip.APIError && error.status === 401) {
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Please check your API key in preferences",
        });
        setShowSettings(true);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (preferences.apiKey) {
      fetchSites();
    }
  }, [preferences.apiKey]);

  // Reset pagination when search changes
  useEffect(() => {
    setCursor(undefined);
    if (preferences.apiKey) {
      fetchSites();
    }
  }, [searchText]);

  const loadMore = () => {
    if (hasNextPage && endCursor) {
      setIsLoadingMore(true);
      setCursor(endCursor);
      fetchSites();
    }
  };

  const filteredSites =
    allSites.filter(
      (site) =>
        searchText === "" ||
        site.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (site.slug && site.slug.toLowerCase().includes(searchText.toLowerCase())),
    ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (showSettings) {
    return (
      <Detail
        markdown="# Setup Required\n\nPlease add your Fingertip API key in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={(isLoading && !!preferences.apiKey) || isLoadingMore}
      searchBarPlaceholder="Search sites by name or slug..."
      onSearchTextChange={setSearchText}
      throttle
      onSelectionChange={(id) => {
        // When user scrolls to the bottom items, load more results
        const index = filteredSites.findIndex((site) => site.id === id);
        if (index >= filteredSites.length - 5 && hasNextPage && !isLoadingMore) {
          loadMore();
        }
      }}
    >
      {filteredSites.map((site, index) => (
        <List.Item
          key={`${site.id}-${index}`}
          id={site.id}
          title={site.name}
          subtitle={site.slug}
          accessories={[
            { tag: { value: sentenceCase(site?.status || ""), color: site.status === "ENABLED" ? "green" : "yellow" } },
            { date: new Date(site.updatedAt), tooltip: `Last updated: ${formatDate(site.updatedAt)}` },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://fingertip.com/sites/${site.slug}`}
                title="Open Site Home"
                icon={Icon.House}
              />
              <Action.OpenInBrowser
                url={`https://fingertip.com/sites/${site.slug}/pages`}
                title="Open Page Editor"
                icon={Icon.Pencil}
              />
              <Action.OpenInBrowser url={`https://fingertip.com/${site.slug}`} title="Open Site" icon={Icon.Link} />
              <Action.CopyToClipboard content={`https://fingertip.com/${site.slug}`} title="Copy Site URL" />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
