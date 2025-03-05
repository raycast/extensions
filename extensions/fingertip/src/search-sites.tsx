import { useState, useEffect, useMemo, useCallback } from "react";
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
import Fingertip from "fingertip";
import { sentenceCase } from "change-case";
import "node-fetch-native/polyfill";
import Fuse from "fuse.js";

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [showSettings, setShowSettings] = useState(!preferences.apiKey);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allSites, setAllSites] = useState<Fingertip.API.V1.SiteListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [fuse, setFuse] = useState<Fuse<Fingertip.API.V1.SiteListResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (allSites.length > 0) {
      setFuse(
        new Fuse(allSites, {
          keys: ["name", "slug"],
          threshold: 0.3,
          includeScore: true,
          ignoreLocation: true,
        }),
      );
    }
  }, [allSites]);

  // Initialize Fingertip client
  const client = useMemo(
    () =>
      new Fingertip({
        apiKey: preferences.apiKey,
      }),
    [preferences.apiKey],
  );

  // Function to fetch sites using the Fingertip client
  const fetchSites = useCallback(async () => {
    if (!preferences.apiKey) {
      setIsLoading(false);
      return;
    }

    if (!cursor) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await client.api.v1.sites.list({
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
      setError(error instanceof Error ? error.message : "Unknown error occurred");

      if (error instanceof Fingertip.APIError && error.status === 401) {
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Please check your API key in preferences",
        });
        setShowSettings(true);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load sites",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cursor, preferences.apiKey]);

  // Initial fetch
  useEffect(() => {
    if (preferences.apiKey) {
      fetchSites();
    } else {
      setIsLoading(false);
    }
  }, [preferences.apiKey]);

  // Reset pagination when search changes
  useEffect(() => {
    setCursor(undefined);
  }, [searchText]);

  const loadMore = () => {
    if (hasNextPage && endCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(endCursor);
      fetchSites();
    }
  };

  const filteredSites = useMemo(() => {
    if (!searchText || searchText.trim() === "") {
      return allSites;
    }

    if (fuse) {
      return fuse.search(searchText).map((result) => result.item);
    }

    // Fallback to current logic if Fuse isn't initialized
    return allSites.filter(
      (site) =>
        site.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (site.slug && site.slug.toLowerCase().includes(searchText.toLowerCase())),
    );
  }, [searchText, allSites, fuse]);

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
      onSearchTextChange={setSearchText}
      throttle
      onSelectionChange={(id) => {
        // When user scrolls to the bottom items, load more results
        const index = filteredSites.findIndex((site) => site.id === id);
        if (index >= filteredSites.length - 5 && hasNextPage && !isLoadingMore) {
          loadMore();
        }
      }}
      searchText={searchText}
    >
      <List.Section
        title="Recently Updated"
        subtitle={
          isLoadingMore
            ? "Loading more..."
            : hasNextPage
              ? "Scroll for more"
              : filteredSites.length > 0
                ? `${filteredSites.length} sites`
                : ""
        }
      >
        {filteredSites.map((site, index) => (
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
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/pages`}
                  title="Pages"
                  icon={Icon.Document}
                />
                <Action.OpenInBrowser
                  url={`https://fingertip.com/sites/${site.slug}/settings`}
                  title="Settings"
                  icon={Icon.Cog}
                />
                <Action.OpenInBrowser url={`https://fingertip.com/${site.slug}`} title="Open Site" icon={Icon.Link} />
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
                  url={`https://fingertip.com/sites/${site.slug}/invoicing`}
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
                <Action.CopyToClipboard content={`https://fingertip.com/${site.slug}`} title="Copy Site URL" />
              </ActionPanel>
            }
          />
        ))}
        {isLoadingMore && <List.Item title="Loading more sites..." icon={Icon.CircleProgress} />}
      </List.Section>

      {/* Properly handle empty states using List.EmptyView */}
      {!isLoading &&
        filteredSites.length === 0 &&
        (error ? (
          <List.EmptyView
            title="Error loading sites"
            description={error}
            icon={{ source: Icon.XMarkCircle }}
            actions={
              <ActionPanel>
                <Action
                  title="Try Again"
                  onAction={() => {
                    setError(null);
                    setCursor(undefined);
                    fetchSites();
                  }}
                  icon={Icon.RotateClockwise}
                />
              </ActionPanel>
            }
          />
        ) : searchText ? (
          <List.EmptyView
            title="No matching sites found"
            description="Try a different search term"
            icon={{ source: Icon.MagnifyingGlass }}
          />
        ) : (
          <List.EmptyView
            title="No sites found"
            description="Create your first site on Fingertip.com"
            icon={{ source: Icon.Globe }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url="https://fingertip.com/onboarding" title="Create New Site" />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
