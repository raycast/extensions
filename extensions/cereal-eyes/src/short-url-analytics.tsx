import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ShortUrl } from "./types";
import { getShortUrlAnalytics } from "./utils/api";

interface Props {
  shortUrl: ShortUrl;
}

function renderBreakdown(
  title: string,
  items: { value: string | null; count: number }[] | undefined,
): string[] {
  const lines = [`## ${title}`];

  if (!items || items.length === 0) {
    lines.push("", "No data yet.");
    return lines;
  }

  lines.push("");

  for (const item of items.slice(0, 8)) {
    lines.push(`- ${item.value ?? "Unknown"}: ${item.count}`);
  }

  return lines;
}

export default function ShortUrlAnalytics({ shortUrl }: Props) {
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => {
    const response = await getShortUrlAnalytics(shortUrl.id);
    return response.data;
  }, []);

  const clicksLast30Days =
    data?.clicks_by_day?.reduce((sum, item) => sum + item.count, 0) ?? 0;

  const markdown = error
    ? [`# ${shortUrl.title ?? shortUrl.short_url}`, "", error.message].join(
        "\n",
      )
    : data?.tier_locked
      ? [
          `# ${shortUrl.title ?? shortUrl.short_url}`,
          "",
          "Analytics are not available on the current plan.",
          "",
          "Upgrade to Standard or Pro to see click analytics for this link.",
        ].join("\n")
      : [
          `# ${shortUrl.title ?? shortUrl.short_url}`,
          "",
          ...renderBreakdown("Countries", data?.by_country),
          "",
          ...renderBreakdown("Devices", data?.by_device),
          "",
          ...renderBreakdown("Referrers", data?.by_referrer),
          ...(data?.analytics_level === "full"
            ? [
                "",
                ...renderBreakdown("Browsers", data?.by_browser),
                "",
                ...renderBreakdown("Operating Systems", data?.by_os),
                "",
                ...renderBreakdown("Cities", data?.by_city),
                "",
                ...renderBreakdown("UTM Sources", data?.by_utm_source),
              ]
            : []),
        ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Link Analytics"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Short URL"
            text={shortUrl.short_url}
            target={shortUrl.short_url}
          />
          <Detail.Metadata.Link
            title="Destination"
            text={shortUrl.original_url}
            target={shortUrl.original_url}
          />
          <Detail.Metadata.Label
            title="Analytics Level"
            text={
              error
                ? "Unavailable"
                : data?.tier_locked
                  ? "Unavailable"
                  : (data?.analytics_level ?? "Unknown")
            }
          />
          <Detail.Metadata.Label
            title="Total Clicks"
            text={String(data?.total_clicks ?? shortUrl.clicks_total)}
          />
          <Detail.Metadata.Label
            title="Last 30 Days"
            text={String(clicksLast30Days)}
          />
          <Detail.Metadata.Label
            title="Last Clicked"
            text={
              shortUrl.last_clicked_at
                ? new Date(shortUrl.last_clicked_at).toLocaleString()
                : "Never"
            }
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Short URL"
            url={shortUrl.short_url}
            icon={Icon.Link}
          />
          <Action.OpenInBrowser
            title="Open Destination"
            url={shortUrl.original_url}
            icon={Icon.Globe}
          />
          <Action
            title="Copy Short URL"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              await Clipboard.copy(shortUrl.short_url);
              await showHUD("Short URL copied");
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
