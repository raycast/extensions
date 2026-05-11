import { ActionPanel, Action, List, getPreferenceValues, Icon, Cache, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import fetch from "node-fetch";

const preferences = getPreferenceValues();

interface Subscription {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created: number;
  status: string;
  referral_count: number;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  subscribed_to_emails: boolean;
}

// Create a cache instance
const cache = new Cache();

// How long (ms) before re-fetching details for the same subscriber
const DETAILS_REFETCH_DELAY = 60 * 1000; // 1 min

// Main command component
export default function Command() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [lastFetchedDetails, setLastFetchedDetails] = useState<{ [key: string]: number }>({});
  const fetchInProgressRef = useRef<string | null>(null);
  // Track whether a background reload is currently running to avoid concurrent executions
  const [isRunning, setIsRunning] = useState(false);

  const filteredSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.email.toLowerCase().includes(searchText.toLowerCase()) ||
      `${subscription.first_name} ${subscription.last_name}`.toLowerCase().includes(searchText.toLowerCase())
  );

  const startReloading = async () => {
    const cachedSubscriptions = JSON.parse((await cache.get("beehiivSubscriptions")) || "[]");
    if (cachedSubscriptions) {
      setSubscriptions(cachedSubscriptions);
    }
    if (isRunning) return;
    setIsRunning(true);
    fetchSubscriptions();
  };

  const clearCache = async () => {
    cache.clear();
  };

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const cachedSubscriptions: Subscription[] = JSON.parse((await cache.get("beehiivSubscriptions")) || "[]");

      let page = 1;
      let totalPages = 1;
      let allSubscriptions: Subscription[] = [];
      let stop = false;

      while (!stop) {
        console.info("PAGE: " + page);
        const response = await fetch(
          `https://api.beehiiv.com/v2/publications/${preferences.publicationId}/subscriptions?limit=100&page=${page}&order_by=created&direction=desc&expand[]=stats`,
          {
            headers: {
              Authorization: `Bearer ${preferences.apiKey}`,
            },
          }
        );

        if (!response.ok) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch subscriptions",
            message: `${response.status} ${response.statusText}`,
          });
          throw new Error("Failed to fetch subscriptions");
        }

        const data = await response.json();
        const fetchedSubscriptions = data.data as Subscription[];
        totalPages = data.total_pages ?? page; // fallback in case API doesn't return

        const foundExisting = fetchedSubscriptions.some((sub) =>
          cachedSubscriptions.some((cached) => cached.created === sub.created)
        );

        allSubscriptions = [...allSubscriptions, ...fetchedSubscriptions];

        // stop if we've processed all pages OR encountered cached item
        if (page >= totalPages || foundExisting) {
          stop = true;
        } else {
          page += 1;
        }
      }

      setSubscriptions(allSubscriptions);
      await cache.set("beehiivSubscriptions", JSON.stringify(allSubscriptions));
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setIsLoading(false);
      setIsRunning(false);
    }
  };

  // Fetch fresh details for a single subscription
  const fetchSubscriptionDetails = async (subId: string) => {
    try {
      console.info("Fetching subscription details for: " + subId);
      if (fetchInProgressRef.current === subId) return;
      const now = Date.now();
      const last = lastFetchedDetails[subId] || 0;
      if (now - last < DETAILS_REFETCH_DELAY) return;

      fetchInProgressRef.current = subId;

      const response = await fetch(
        `https://api.beehiiv.com/v2/publications/${preferences.publicationId}/subscriptions/${subId}`,
        { headers: { Authorization: `Bearer ${preferences.apiKey}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch subscription details");

      const data = await response.json();
      const updatedSub = data.data as Subscription;

      setSubscriptions((current) => current.map((s) => (s.id === subId ? { ...s, ...updatedSub } : s)));

      // update cache
      const cached: Subscription[] = JSON.parse((await cache.get("beehiivSubscriptions")) || "[]");
      const updatedCache = cached.map((s) => (s.id === subId ? { ...s, ...updatedSub } : s));
      await cache.set("beehiivSubscriptions", JSON.stringify(updatedCache));

      setLastFetchedDetails((prev) => ({ ...prev, [subId]: now }));
    } catch (e) {
      console.error("Error fetching subscription details", e);
    } finally {
      if (fetchInProgressRef.current === subId) fetchInProgressRef.current = null;
    }
  };

  useEffect(() => {
    startReloading();
  }, []);

  useEffect(() => {
    if (selectedSubId) {
      fetchSubscriptionDetails(selectedSubId);
    }
  }, [selectedSubId]);

  function SubscriptionListItem({ subscription }: { subscription: Subscription }) {
    const parseDate = (date: number) => {
      if (date) {
        return new Date(date * 1000).toLocaleString();
      } else {
        return "-";
      }
    };

    return (
      <List.Item
        title={subscription.email}
        id={subscription.id}
        accessories={[{ icon: subscription.status === "active" ? Icon.CheckCircle : Icon.Circle }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Subscriber"
              url={`https://app.beehiiv.com/subscribers/${subscription.id.replace("sub_", "")}`}
              icon={Icon.Link}
            />
            <Action.CopyToClipboard
              title="Copy Email"
              content={subscription.email}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action title="Refresh Subscriptions" onAction={startReloading} icon={Icon.ArrowClockwise} />
            <Action title="Clear Subscriptions Cache" onAction={clearCache} icon={Icon.XMarkCircle} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="E-mail Address"
                  text={subscription.email}
                  icon={Icon.AtSymbol}
                />
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={subscription.status}
                  icon={subscription.status === "active" ? Icon.CheckCircle : Icon.Circle}
                />
                <List.Item.Detail.Metadata.Label
                  title="Subscribed Date"
                  text={parseDate(subscription.created)}
                  icon={Icon.Calendar}
                />
                <List.Item.Detail.Metadata.Label
                  title="UTM Source"
                  text={subscription.utm_source || "-"}
                  icon={Icon.Link}
                />
                <List.Item.Detail.Metadata.Label
                  title="UTM Medium"
                  text={subscription.utm_medium || "-"}
                  icon={Icon.Link}
                />
                <List.Item.Detail.Metadata.Label
                  title="UTM Campaign"
                  text={subscription.utm_campaign || "-"}
                  icon={Icon.Link}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search subscribers..."
      throttle
      isShowingDetail={true}
      onSelectionChange={(id) => {
        if (id && id !== selectedSubId) setSelectedSubId(id);
      }}
    >
      {filteredSubscriptions.map((subscription) => (
        <SubscriptionListItem key={subscription.id} subscription={subscription} />
      ))}
    </List>
  );
}
