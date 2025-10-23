import { useState, useEffect, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
  open,
} from "@raycast/api";
import { HubSpotApiClient } from "./lib/hubspot-api";
import { HubSpotMarketingEmail } from "./types/hubspot";

interface Preferences {
  hubspotApiKey: string;
  hubspotPortalId: string;
}

export default function SearchMarketingEmails() {
  const [emails, setEmails] = useState<HubSpotMarketingEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [apiClient, setApiClient] = useState<HubSpotApiClient | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [after, setAfter] = useState<string | undefined>();
  const [pageCount, setPageCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HubSpotMarketingEmail[]>(
    [],
  );
  const [searchProgress, setSearchProgress] = useState({
    current: 0,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (!preferences.hubspotApiKey || !preferences.hubspotPortalId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please set your HubSpot API key and Portal ID in preferences",
      });
      setIsLoading(false);
      return;
    }

    const client = new HubSpotApiClient({
      apiKey: preferences.hubspotApiKey,
      portalId: preferences.hubspotPortalId,
    });
    setApiClient(client);
  }, [preferences.hubspotApiKey, preferences.hubspotPortalId]);

  const loadMoreEmails = useCallback(async () => {
    if (!apiClient || !hasMore) return;

    try {
      setIsLoading(true);
      const response = await apiClient.client.get("/marketing/v3/emails", {
        params: {
          limit: 100,
          includeStats: true,
          sort: "-updatedAt",
          ...(after && { after }),
        },
      });

      const { results, paging } = response.data;

      if (results && Array.isArray(results)) {
        setEmails((prev) => [...prev, ...results]);
        setPageCount((prev) => prev + 1);
        console.log(
          `Loaded page ${pageCount + 1} with ${results.length} emails`,
        );
      }

      if (paging && paging.next && paging.next.after) {
        setAfter(paging.next.after);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more emails:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load emails",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, after, hasMore, pageCount]);

  // Load initial items when component mounts
  useEffect(() => {
    if (apiClient && emails.length === 0) {
      loadMoreEmails();
    }
  }, [apiClient, loadMoreEmails, emails.length]);

  const searchEmails = useCallback(
    async (query: string) => {
      if (!apiClient || !query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchProgress({ current: 0, total: 0 });
        return;
      }

      try {
        setIsSearching(true);
        setSearchProgress({ current: 0, total: 0 });

        const allResults: HubSpotMarketingEmail[] = [];
        let currentAfter: string | undefined;
        let hasMore = true;
        let pageCount = 0;

        // First, search through already loaded emails
        const localResults = emails.filter(
          (email) =>
            (email.name || "").toLowerCase().includes(query.toLowerCase()) ||
            (email.subject || "").toLowerCase().includes(query.toLowerCase()),
        );
        allResults.push(...localResults);

        // Continue searching through remaining pages
        while (hasMore) {
          pageCount++;
          setSearchProgress({ current: pageCount, total: pageCount + 1 }); // Show progress

          const response = await apiClient.client.get("/marketing/v3/emails", {
            params: {
              limit: 100,
              includeStats: true,
              sort: "-updatedAt",
              ...(currentAfter && { after: currentAfter }),
            },
          });

          const { results, paging } = response.data;

          if (results && Array.isArray(results)) {
            const pageResults = results.filter(
              (email) =>
                (email.name || "")
                  .toLowerCase()
                  .includes(query.toLowerCase()) ||
                (email.subject || "")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            );
            allResults.push(...pageResults);
          }

          if (paging && paging.next && paging.next.after) {
            currentAfter = paging.next.after;
          } else {
            hasMore = false;
          }
        }

        setSearchResults(allResults);
      } catch (error) {
        console.error("Search error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: "Could not search emails",
        });
      } finally {
        setIsSearching(false);
        setSearchProgress({ current: 0, total: 0 });
      }
    },
    [apiClient, emails],
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.trim()) {
        searchEmails(searchText);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, searchEmails]);

  const displayEmails = (searchText.trim() ? searchResults : emails).filter(
    (email) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return email.isPublished;
      if (statusFilter === "inactive") return !email.isPublished;
      return true;
    },
  );

  const getEmailStatusIcon = (email: HubSpotMarketingEmail) => {
    if (email.isPublished) {
      return Icon.CheckCircle;
    } else if (email.state === "DRAFT") {
      return Icon.Document;
    } else {
      return Icon.Clock;
    }
  };

  const getEmailStatusColor = (email: HubSpotMarketingEmail) => {
    if (email.isPublished) {
      return Color.Green;
    } else if (email.state === "DRAFT") {
      return Color.Orange;
    } else {
      return Color.SecondaryText;
    }
  };

  const openEmailInHubSpot = (email: HubSpotMarketingEmail) => {
    if (apiClient) {
      const url = apiClient.getMarketingEmailUrl(email.id);
      open(url);
    }
  };

  const copyEmailId = (email: HubSpotMarketingEmail) => {
    return email.id;
  };

  const copyEmailSubject = (email: HubSpotMarketingEmail) => {
    return email.subject;
  };

  const formatStats = (email: HubSpotMarketingEmail) => {
    if (!email.stats) return "No stats available";

    const { counters, ratios } = email.stats;
    const sent = counters.sent || 0;
    const openRate = ratios.openratio || 0;
    const clickRate = ratios.clickratio || 0;

    return `${sent} sent • ${openRate.toFixed(1)}% open • ${clickRate.toFixed(1)}% click`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <List
      isLoading={isLoading || isSearching}
      searchBarPlaceholder={
        isSearching
          ? `Searching batch ${searchProgress.current} of ${searchProgress.total}...`
          : "Search marketing emails by name or subject..."
      }
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={statusFilter}
          onChange={(newValue) =>
            setStatusFilter(newValue as "all" | "active" | "inactive")
          }
        >
          <List.Dropdown.Item title="All Emails" value="all" />
          <List.Dropdown.Item title="Published" value="active" />
          <List.Dropdown.Item title="Draft" value="inactive" />
        </List.Dropdown>
      }
      pagination={
        searchText.trim()
          ? undefined
          : {
              onLoadMore: loadMoreEmails,
              hasMore: hasMore,
              pageSize: 100,
            }
      }
    >
      {displayEmails.map((email) => (
        <List.Item
          key={email.id}
          title={email.name}
          subtitle={formatStats(email)}
          icon={{
            source: getEmailStatusIcon(email),
            tintColor: getEmailStatusColor(email),
          }}
          accessories={[
            {
              text: formatDate(email.updatedAt),
              icon: Icon.Calendar,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Hubspot"
                icon={Icon.Link}
                onAction={() => openEmailInHubSpot(email)}
              />
              <Action.CopyToClipboard
                title="Copy Email Id"
                content={copyEmailId(email)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Email Subject"
                content={copyEmailSubject(email)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Refresh Emails"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setEmails([]);
                  setAfter(undefined);
                  setHasMore(true);
                  setPageCount(0);
                  loadMoreEmails();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {isSearching && searchProgress.total > 0 && (
        <List.Item
          title={`Searching batch ${searchProgress.current} of ${searchProgress.total}...`}
          subtitle="Please wait while we search through all marketing emails"
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}
