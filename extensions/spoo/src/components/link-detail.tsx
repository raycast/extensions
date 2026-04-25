import { Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useMemo } from "react";
import { useStats } from "@/hooks/use-stats";
import { formatClicks, formatRelative } from "@/lib/format";
import { getStatusMeta } from "@/lib/status";
import { summaryOf } from "@/schemas/stats";
import type { UrlListItem } from "@/schemas/url";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

export function LinkDetailSidebar({ link }: { link: UrlListItem }) {
  const alias = link.alias ?? link.id;
  const status = getStatusMeta(link.status);
  const statsOptions = useMemo(
    () => ({
      scope: "all" as const,
      shortCode: alias,
      groupBy: ["time"] as const,
      startDate: new Date(Date.now() - WINDOW_DAYS * DAY_MS)
        .toISOString()
        .slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    }),
    [alias],
  );
  const { stats } = useStats(statsOptions);
  const windowSummary = stats ? summaryOf(stats) : null;
  const destinationHost = link.long_url ? safeHostname(link.long_url) : null;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {link.long_url && destinationHost ? (
            <List.Item.Detail.Metadata.Label
              title="Site"
              icon={getFavicon(link.long_url, { fallback: Icon.Globe })}
              text={destinationHost}
            />
          ) : null}
          <List.Item.Detail.Metadata.Link
            title="Short URL"
            target={link.short_url}
            text={link.short_url}
          />
          {link.long_url ? (
            <List.Item.Detail.Metadata.Link
              title="Long URL"
              target={link.long_url}
              text={link.long_url}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Status"
            icon={{ source: status.icon, tintColor: status.tintColor }}
            text={status.label}
          />
          <List.Item.Detail.Metadata.Label
            title="Clicks · 30d"
            text={
              windowSummary ? formatClicks(windowSummary.total_clicks) : "…"
            }
            icon={Icon.Eye}
          />
          <List.Item.Detail.Metadata.Label
            title="Unique · 30d"
            text={
              windowSummary ? formatClicks(windowSummary.unique_clicks) : "…"
            }
            icon={Icon.Person}
          />
          <List.Item.Detail.Metadata.Separator />
          {link.created_at ? (
            <List.Item.Detail.Metadata.Label
              title="Created"
              text={formatRelative(link.created_at)}
            />
          ) : null}
          {link.last_click ? (
            <List.Item.Detail.Metadata.Label
              title="Last click"
              text={formatRelative(link.last_click)}
            />
          ) : null}
          {link.expire_after ? (
            <List.Item.Detail.Metadata.Label
              title="Expires"
              text={formatRelative(link.expire_after)}
              icon={Icon.Clock}
            />
          ) : null}
          {link.max_clicks ? (
            <List.Item.Detail.Metadata.Label
              title="Max clicks"
              text={`${link.total_clicks ?? 0} / ${link.max_clicks}`}
            />
          ) : null}
          <List.Item.Detail.Metadata.TagList title="Flags">
            {link.password_set ? (
              <List.Item.Detail.Metadata.TagList.Item
                text="Password"
                color={Color.Yellow}
                icon={Icon.Lock}
              />
            ) : null}
            {link.block_bots ? (
              <List.Item.Detail.Metadata.TagList.Item
                text="Block bots"
                color={Color.Purple}
              />
            ) : null}
            {link.private_stats ? (
              <List.Item.Detail.Metadata.TagList.Item
                text="Private stats"
                color={Color.Blue}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
