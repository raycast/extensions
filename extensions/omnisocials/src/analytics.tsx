import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getAnalyticsOverview } from "./lib/api";
import { getBaseUrl } from "./lib/preferences";
import type { AnalyticsOverview } from "./lib/types";
import { PLATFORM_LABELS, type Platform } from "./lib/constants";
import { formatNumber, getPlatformIcon } from "./lib/utils";
import { useWorkspace } from "./lib/useWorkspace";
import { ApiKeyRequiredView } from "./components/api-key-required";

export default function AnalyticsCommand() {
  const { isLoading: wsLoading, hasApiKey, navigationTitle } = useWorkspace();
  if (wsLoading) return <List isLoading />;
  if (!hasApiKey) return <ApiKeyRequiredView />;
  return <AnalyticsView navigationTitle={navigationTitle} />;
}

function AnalyticsView({ navigationTitle }: { navigationTitle?: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = getBaseUrl();

  async function fetchAnalytics() {
    setIsLoading(true);
    try {
      const response = await getAnalyticsOverview(period);
      setAnalytics(response.data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Search analytics..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Period"
          value={period}
          onChange={(v) => setPeriod(v as "7d" | "30d" | "90d")}
        >
          <List.Dropdown.Item title="Last 7 days" value="7d" />
          <List.Dropdown.Item title="Last 30 days" value="30d" />
          <List.Dropdown.Item title="Last 90 days" value="90d" />
        </List.Dropdown>
      }
    >
      {analytics && (
        <>
          <List.Section title="Overview">
            <List.Item
              title="Total Posts"
              icon={{ source: Icon.Document, tintColor: Color.Blue }}
              accessories={[{ text: String(analytics.total_posts) }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Analytics"
                    url={`${baseUrl}/analytics`}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Total Engagement"
              icon={{ source: Icon.Heart, tintColor: Color.Red }}
              accessories={[{ text: formatNumber(analytics.total_engagement) }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Analytics"
                    url={`${baseUrl}/analytics`}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Total Impressions"
              icon={{ source: Icon.Eye, tintColor: Color.Purple }}
              accessories={[
                { text: formatNumber(analytics.total_impressions) },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Analytics"
                    url={`${baseUrl}/analytics`}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Avg Engagement Rate"
              icon={{ source: Icon.BarChart, tintColor: Color.Green }}
              accessories={[
                { text: `${analytics.average_engagement_rate.toFixed(2)}%` },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Analytics"
                    url={`${baseUrl}/analytics`}
                  />
                </ActionPanel>
              }
            />
            {analytics.top_performing_platform && (
              <List.Item
                title="Top Platform"
                icon={getPlatformIcon(analytics.top_performing_platform)}
                accessories={[
                  {
                    text:
                      PLATFORM_LABELS[
                        analytics.top_performing_platform as Platform
                      ] || analytics.top_performing_platform,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open Analytics"
                      url={`${baseUrl}/analytics`}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>

          <List.Section title="Platform Breakdown">
            {Object.entries(analytics.platform_breakdown).map(
              ([platform, data]) => (
                <List.Item
                  key={platform}
                  title={PLATFORM_LABELS[platform as Platform] || platform}
                  icon={getPlatformIcon(platform)}
                  accessories={[
                    { text: `${data.posts} posts`, icon: Icon.Document },
                    {
                      text: formatNumber(data.total_engagement),
                      icon: Icon.Heart,
                    },
                    {
                      text: `${data.engagement_rate.toFixed(1)}%`,
                      icon: Icon.BarChart,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open Analytics"
                        url={`${baseUrl}/analytics`}
                      />
                      <Action.CopyToClipboard
                        title="Copy Stats"
                        content={`${PLATFORM_LABELS[platform as Platform] || platform}: ${data.posts} posts, ${formatNumber(data.total_engagement)} engagement, ${data.engagement_rate.toFixed(1)}% rate`}
                      />
                    </ActionPanel>
                  }
                />
              ),
            )}
          </List.Section>
        </>
      )}
      {!analytics && !isLoading && (
        <List.EmptyView
          title="No analytics data"
          description="Publish some posts to see analytics"
          icon="icon.png"
        />
      )}
    </List>
  );
}
