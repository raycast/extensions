import { useMemo } from "react";
import { Action, ActionPanel, Color, Icon, Image, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { countOf } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import {
  AccountInsights,
  POST_INSIGHT_METRICS,
  PostInsights,
  ThreadsPost,
  ThreadsProfile,
  getAccountInsights,
  getPostInsights,
  getPosts,
  getProfile,
  mapWithConcurrency,
  nullIfRefused,
} from "./lib/threads-api";
import { getAccessToken, showApiError } from "./lib/threads-auth";
import { ApiErrorView, MissingTokenView, StaleDataSection } from "./components/token-views";
import {
  MEDIA_TYPE_LABEL,
  formatDate,
  formatDateTime,
  formatNumber,
  periodWindow,
  postKeywords,
  postTitle,
  postsInWindow,
} from "./lib/format";
import { THREADS_BASE_URL } from "./lib/constants";

/**
 * Every post costs one insights request against a per-hour budget shared by all three
 * commands, so the list is the newest N posts rather than everything in the period.
 */
const MAX_POSTS = 25;
const INSIGHTS_CONCURRENCY = 8;

const PERIODS = [
  { title: "Last 7 days", value: "7" },
  { title: "Last 14 days", value: "14" },
  { title: "Last 30 days", value: "30" },
  { title: "Last 90 days", value: "90" },
] as const;

interface PostWithInsights {
  post: ThreadsPost;
  insights: PostInsights | null;
  keywords: string[];
}

interface AccountData {
  profile: ThreadsProfile;
  /** `null` when the API refuses insights for this account but the profile loaded. */
  account: AccountInsights | null;
  /**
   * The window these numbers were fetched for. The label must come from here, not
   * from the dropdown: cached or kept-previous data can belong to another period.
   */
  since: Date;
  until: Date;
  fetchedAt: Date;
}

interface PostsData {
  posts: PostWithInsights[];
  truncated: boolean;
  fetchedAt: Date;
}

/** Cheap and period-dependent: three calls, re-run whenever the dropdown changes. */
async function loadAccount(accessToken: string, days: string): Promise<AccountData> {
  const { since, until } = periodWindow(Number(days));
  const [profile, account] = await Promise.all([
    getProfile(accessToken),
    // Account metrics are one section of the screen. Losing them should not also
    // discard the profile and the post list that loaded fine alongside.
    nullIfRefused(getAccountInsights(accessToken, since, until), (error) =>
      logger.error(`[analytics] Account insights unavailable`, { error: error.message }),
    ),
  ]);
  return { profile, account, since, until, fetchedAt: new Date() };
}

/**
 * Expensive and period-independent: per-post metrics are lifetime totals, not
 * period-scoped, so the same posts serve every period and the dropdown filters them
 * client-side. Keying this on the period instead made each switch re-run the whole
 * fan-out.
 */
async function loadPosts(accessToken: string): Promise<PostsData> {
  const { posts, truncated } = await getPosts(accessToken, { maxPosts: MAX_POSTS });
  const insights = await mapWithConcurrency(posts, INSIGHTS_CONCURRENCY, (post) =>
    getPostInsights(accessToken, post.id),
  );
  logger.log(`[analytics] Loaded posts`, { posts: posts.length, truncated });

  return {
    posts: posts.map((post, index) => ({
      post,
      insights: insights[index],
      // Precomputed: deriving these per render re-splits every post body on every
      // keystroke in the search bar.
      keywords: postKeywords(post.text),
    })),
    truncated,
    fetchedAt: new Date(),
  };
}

export default function Command() {
  const accessToken = getAccessToken();
  const [period, setPeriod] = useCachedState("analytics-period", "30");
  const { since } = useMemo(() => periodWindow(Number(period)), [period]);

  const account = useCachedPromise(loadAccount, [accessToken ?? "", period], {
    execute: Boolean(accessToken),
    keepPreviousData: true,
    onError: (error) => void showApiError(error, { title: "Couldn't Load Analytics" }),
  });

  const posts = useCachedPromise(loadPosts, [accessToken ?? ""], {
    execute: Boolean(accessToken),
    keepPreviousData: true,
    // Toast only when the account hook hasn't already: two toasts for one outage is
    // noise, but the posts fan-out is the load most likely to hit the rate limit on
    // its own, after the three account calls succeeded.
    onError: (error) => {
      if (!account.error) void showApiError(error, { title: "Couldn't Load Posts" });
    },
  });

  const visible = useMemo(
    () => postsInWindow(posts.data?.posts ?? [], Boolean(posts.data?.truncated), since),
    [posts.data, since],
  );
  // Counted against the window the account numbers were fetched for, not the dropdown:
  // while a period switch loads, the account section still shows the previous period.
  const accountPostsInPeriod = useMemo(() => {
    if (!posts.data || !account.data) return "–";
    const inWindow = postsInWindow(posts.data.posts, posts.data.truncated, account.data.since);
    return inWindow.truncated ? `${formatNumber(inWindow.posts.length)}+` : formatNumber(inWindow.posts.length);
  }, [posts.data, account.data]);

  if (!accessToken) return <MissingTokenView />;

  const error = account.error ?? posts.error;
  // Match the toast the user just saw: a posts-only failure toasted "Couldn't Load Posts".
  const errorTitle = account.error ? "Couldn't Load Analytics" : "Couldn't Load Posts";
  const hasData = Boolean(account.data || posts.data);
  const revalidate = () => {
    account.revalidate();
    posts.revalidate();
  };

  return (
    <List
      isLoading={account.isLoading || posts.isLoading}
      isShowingDetail={hasData}
      searchBarPlaceholder="Search posts…"
      searchBarAccessory={
        <List.Dropdown tooltip="Period" value={period} onChange={setPeriod}>
          {PERIODS.map((item) => (
            <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error && !hasData ? <ApiErrorView error={error} fallbackTitle={errorTitle} onRefresh={revalidate} /> : null}

      {error && hasData ? <StaleDataSection error={error} fallbackTitle={errorTitle} onRefresh={revalidate} /> : null}

      {account.data ? (
        <List.Section title="Account">
          <AccountItem data={account.data} postsInPeriod={accountPostsInPeriod} onRefresh={revalidate} />
        </List.Section>
      ) : null}

      {posts.data ? (
        <List.Section
          title="Posts"
          subtitle={
            visible.truncated
              ? `${countOf(visible.posts.length, "post")} · newest ${MAX_POSTS} only`
              : countOf(visible.posts.length, "post")
          }
        >
          {visible.posts.map((item) => (
            <PostItem key={item.post.id} item={item} onRefresh={revalidate} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function AccountItem({
  data,
  postsInPeriod,
  onRefresh,
}: {
  data: AccountData;
  /** Preformatted: "–" until posts load, and a trailing "+" when the post cap cut the period short. */
  postsInPeriod: string;
  onRefresh: () => void;
}) {
  const { profile, account } = data;
  const periodLabel = `${formatDate(data.since)} – ${formatDate(data.until)}`;

  const dailyRows = (account?.viewsByDay ?? [])
    .map((day) => `| ${formatDate(day.endTime)} | ${formatNumber(day.value)} |`)
    .join("\n");
  const markdown = [
    `# @${profile.username}`,
    profile.biography ?? "",
    "",
    `**Period:** ${periodLabel}`,
    "",
    !account
      ? "_The Threads API did not return account insights for this account._"
      : account.viewsByDay.length > 0
        ? `## Views by Day\n\n| Day | Views |\n| --- | ---: |\n${dailyRows}`
        : "_No daily views reported for this period._",
  ].join("\n");

  const metrics = [
    `Followers: ${formatNumber(account?.followersCount)}`,
    `Views: ${formatNumber(account?.views)}`,
    `Likes: ${formatNumber(account?.likes)}`,
    `Replies: ${formatNumber(account?.replies)}`,
    `Reposts: ${formatNumber(account?.reposts)}`,
    `Quotes: ${formatNumber(account?.quotes)}`,
    `Posts: ${postsInPeriod}`,
  ];

  return (
    <List.Item
      icon={profile.profilePictureUrl ? { source: profile.profilePictureUrl, mask: Image.Mask.Circle } : Icon.Person}
      title={`@${profile.username}`}
      subtitle={profile.name}
      keywords={[profile.username, profile.name ?? ""]}
      accessories={[{ icon: Icon.TwoPeople, text: formatNumber(account?.followersCount), tooltip: "Followers" }]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Followers" text={formatNumber(account?.followersCount)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Views" text={formatNumber(account?.views)} />
              <List.Item.Detail.Metadata.Label title="Likes" text={formatNumber(account?.likes)} />
              <List.Item.Detail.Metadata.Label title="Replies" text={formatNumber(account?.replies)} />
              <List.Item.Detail.Metadata.Label title="Reposts" text={formatNumber(account?.reposts)} />
              <List.Item.Detail.Metadata.Label title="Quotes" text={formatNumber(account?.quotes)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Posts in Period" text={postsInPeriod} />
              <List.Item.Detail.Metadata.Label title="Period" text={periodLabel} />
              <List.Item.Detail.Metadata.Label title="Fetched" text={formatDateTime(data.fetchedAt)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Insights on Threads" url={`${THREADS_BASE_URL}/insights`} />
          <Action.OpenInBrowser title="Open Profile" url={`${THREADS_BASE_URL}/@${profile.username}`} />
          <Action.CopyToClipboard
            title="Copy Account Metrics"
            content={`@${profile.username} (${periodLabel})\n${metrics.join("\n")}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <CommonActions onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function PostItem({ item, onRefresh }: { item: PostWithInsights; onRefresh: () => void }) {
  const { post, insights, keywords } = item;
  const title = postTitle(post.text);

  const metricsText = insights
    ? POST_INSIGHT_METRICS.map((metric) => `${capitalize(metric)}: ${formatNumber(insights[metric])}`).join("\n")
    : "Insights unavailable";

  const markdown = [
    post.text.trim() ? post.text : "_No text_",
    ...(post.permalink ? ["", `[Open on Threads](${post.permalink})`] : []),
  ].join("\n");

  return (
    <List.Item
      icon={mediaTypeIcon(post.mediaType)}
      title={title}
      keywords={keywords}
      accessories={[
        insights
          ? { icon: Icon.Eye, text: formatNumber(insights.views), tooltip: "Views" }
          : { text: "–", tooltip: "Insights unavailable" },
        { date: new Date(post.timestamp), tooltip: formatDateTime(post.timestamp) },
      ]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {insights ? (
                POST_INSIGHT_METRICS.map((metric) => (
                  <List.Item.Detail.Metadata.Label
                    key={metric}
                    title={capitalize(metric)}
                    text={formatNumber(insights[metric])}
                  />
                ))
              ) : (
                <List.Item.Detail.Metadata.Label title="Insights" text="Unavailable for this post" />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Media Type" text={MEDIA_TYPE_LABEL[post.mediaType]} />
              <List.Item.Detail.Metadata.Label title="Posted" text={formatDateTime(post.timestamp)} />
              <List.Item.Detail.Metadata.Label title="Post ID" text={post.id} />
              {post.permalink ? (
                <List.Item.Detail.Metadata.Link title="Permalink" text={post.permalink} target={post.permalink} />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {post.permalink ? <Action.OpenInBrowser title="Open on Threads" url={post.permalink} /> : null}
          <Action.CopyToClipboard
            title="Copy Post Metrics"
            content={`${title}\n${post.permalink}\n${metricsText}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {post.permalink ? (
            <Action.CopyToClipboard
              title="Copy Permalink"
              content={post.permalink}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Post ID" content={post.id} />
          <CommonActions onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function CommonActions({ onRefresh }: { onRefresh: () => void }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

function mediaTypeIcon(mediaType: ThreadsPost["mediaType"]) {
  switch (mediaType) {
    case "IMAGE":
      return { source: Icon.Image, tintColor: Color.Blue };
    case "VIDEO":
      return { source: Icon.Video, tintColor: Color.Purple };
    case "CAROUSEL_ALBUM":
      return { source: Icon.AppWindowGrid2x2, tintColor: Color.Orange };
    case "AUDIO":
      return { source: Icon.Microphone, tintColor: Color.Green };
    default:
      return { source: Icon.Text, tintColor: Color.SecondaryText };
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
