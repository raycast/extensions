import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { useProfiles } from "../lib/hooks";
import { commentTargets } from "../lib/comments";
import { formatNumber } from "../lib/format";
import { api, authHeaders, normalizeList } from "../lib/postproxy";
import { platformIcon, platformLabel } from "../lib/platforms";
import { totalImpressions } from "../lib/stats";
import type { Post, PostStatsResponse } from "../lib/types";
import { CommentsView } from "./CommentsView";
import { PostDetail } from "./PostDetail";

const STATUS_COLOR: Record<string, Color> = {
  processed: Color.Green,
  scheduled: Color.Blue,
  pending: Color.Yellow,
  processing: Color.Blue,
  draft: Color.SecondaryText,
  media_processing_failed: Color.Red,
};

/** Status filter values accepted by the API's `by_status` scope. */
const STATUSES = [
  { value: "draft", title: "Draft" },
  { value: "scheduled", title: "Scheduled" },
  { value: "published", title: "Published" },
  { value: "failed", title: "Failed" },
];

const FILTER_COLOR: Record<string, Color> = {
  draft: Color.SecondaryText,
  scheduled: Color.Blue,
  published: Color.Green,
  failed: Color.Red,
};

const DATE_RANGES = [
  { value: "all", title: "All time" },
  { value: "today", title: "Today" },
  { value: "7", title: "Last 7 days" },
  { value: "30", title: "Last 30 days" },
  { value: "90", title: "Last 90 days" },
];

function dateRangeTitle(value: string): string {
  return DATE_RANGES.find((r) => r.value === value)?.title ?? "All time";
}

/** Epoch ms floor for a date-range value, or null for "all time". */
function dateThreshold(value: string): number | null {
  if (value === "all") return null;
  if (value === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  return Date.now() - Number(value) * 86_400_000;
}

function uniquePlatforms(post: Post): string[] {
  return Array.from(new Set(post.platforms.map((outcome) => outcome.platform)));
}

/**
 * Reusable, filterable list of posts. Used by the Recent Posts command and,
 * scoped to a single profile, by the "View Posts" action on the Profiles screen.
 *
 * Platform and status filter server-side; the date range filters client-side
 * (the API only orders by created_at desc and has no created-date range param),
 * so we fetch a wider page and narrow locally.
 */
export function PostList({
  profileId,
  navigationTitle,
  initialStatus,
}: {
  profileId?: string;
  navigationTitle?: string;
  initialStatus?: string;
}) {
  const { data: profiles } = useProfiles();
  const [status, setStatus] = useState(initialStatus ?? "");
  const [platform, setPlatform] = useState("");
  const [dateRange, setDateRange] = useState("all");

  const params = new URLSearchParams({ per_page: "100" });
  if (status) params.set("status", status);
  if (profileId) params.set("profile_id", profileId);
  else if (platform) params.append("platforms[]", platform);

  const { data, isLoading, revalidate } = useFetch(api(`/posts?${params.toString()}`), {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<Post>(result) }),
    keepPreviousData: true,
    initialData: [] as Post[],
  });

  const threshold = dateThreshold(dateRange);
  const posts = threshold == null ? data : data.filter((post) => new Date(post.created_at).getTime() >= threshold);

  // One batch stats call for the visible posts → total impressions per row.
  const ids = posts.map((post) => post.id);
  const { data: stats } = useFetch<PostStatsResponse>(api(`/posts/stats?post_ids=${ids.join(",")}`), {
    headers: authHeaders(),
    execute: ids.length > 0,
    keepPreviousData: true,
  });

  const platformOptions = Array.from(new Set(profiles.map((p) => p.platform)));

  const activeBits = [
    !profileId && platform ? platformLabel(platform) : "",
    status,
    dateRange === "all" ? "" : dateRangeTitle(dateRange),
  ].filter(Boolean);
  const title = navigationTitle ?? "Recent Posts";
  const fullTitle = activeBits.length > 0 ? `${title} · ${activeBits.join(" · ")}` : title;

  const filters = (
    <ActionPanel.Section title="Filters">
      {!profileId ? (
        <ActionPanel.Submenu
          title="Filter by Platform"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        >
          <Action icon={Icon.Globe} title="All Platforms" onAction={() => setPlatform("")} />
          {platformOptions.map((p) => (
            <Action key={p} icon={platformIcon(p)} title={platformLabel(p)} onAction={() => setPlatform(p)} />
          ))}
        </ActionPanel.Submenu>
      ) : null}
      <ActionPanel.Submenu
        title="Filter by Status"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      >
        <Action icon={Icon.Tag} title="All Statuses" onAction={() => setStatus("")} />
        {STATUSES.map((s) => (
          <Action
            key={s.value}
            icon={{ source: Icon.Dot, tintColor: FILTER_COLOR[s.value] ?? Color.PrimaryText }}
            title={s.title}
            onAction={() => setStatus(s.value)}
          />
        ))}
      </ActionPanel.Submenu>
      <Action
        icon={Icon.XMarkCircle}
        title="Clear Filters"
        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        onAction={() => {
          setStatus("");
          setPlatform("");
          setDateRange("all");
        }}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={fullTitle}
      searchBarPlaceholder="Search posts…"
      searchBarAccessory={
        <List.Dropdown tooltip="Date range" value={dateRange} onChange={setDateRange}>
          {DATE_RANGES.map((range) => (
            <List.Dropdown.Item key={range.value} icon={Icon.Calendar} title={range.title} value={range.value} />
          ))}
        </List.Dropdown>
      }
    >
      {posts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No posts match your filters"
          description="Adjust the date range, platform, or status."
          actions={<ActionPanel>{filters}</ActionPanel>}
        />
      ) : (
        posts.map((post) => {
          const text = (post.body ?? post.content ?? "").replace(/\s+/g, " ").trim();
          const impressions = totalImpressions(stats, post.id);
          const targets = commentTargets(post, profiles);
          const accessories: List.Item.Accessory[] = [
            ...uniquePlatforms(post)
              .slice(0, 5)
              .map((p): List.Item.Accessory => ({ icon: platformIcon(p) })),
            ...(impressions > 0
              ? [
                  {
                    icon: Icon.LineChart,
                    text: formatNumber(impressions),
                    tooltip: "Total impressions",
                  } as List.Item.Accessory,
                ]
              : []),
            ...(post.scheduled_at ? [{ date: new Date(post.scheduled_at) }] : []),
            { tag: { value: post.status, color: STATUS_COLOR[post.status] ?? Color.PrimaryText } },
          ];
          return (
            <List.Item
              key={post.id}
              icon={post.draft ? Icon.Pencil : Icon.Document}
              title={text.length > 0 ? text.slice(0, 70) : "(no text)"}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Post"
                    icon={Icon.Eye}
                    target={<PostDetail post={post} onChange={revalidate} />}
                  />
                  {targets.length === 1 ? (
                    <Action.Push
                      title="View Comments"
                      icon={Icon.Bubble}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      target={<CommentsView postId={post.id} profileId={targets[0].profileId} />}
                    />
                  ) : targets.length > 1 ? (
                    <ActionPanel.Submenu
                      title="View Comments"
                      icon={Icon.Bubble}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    >
                      {targets.map((target) => (
                        <Action.Push
                          key={target.profileId}
                          title={`${platformLabel(target.platform)} · ${target.name}`}
                          icon={platformIcon(target.platform)}
                          target={<CommentsView postId={post.id} profileId={target.profileId} />}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  ) : null}
                  {filters}
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => revalidate()}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
