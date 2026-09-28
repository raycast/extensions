import {
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { countOf } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import {
  AccountInsights,
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
import {
  MISSING_TOKEN_TITLE,
  describeApiError,
  getAccessToken,
  isTokenExpired,
  showApiError,
} from "./lib/threads-auth";
import { formatCompact, formatDateTime, formatNumber, periodWindow, postTitle } from "./lib/format";
import { THREADS_BASE_URL } from "./lib/constants";

const DEFAULT_PERIOD_DAYS = 7;

/**
 * Far tighter than the List's 80. A menu bar title is shared with every other menu
 * extra, and CJK text is roughly twice as wide per character as Latin.
 */
const MENU_BAR_TITLE_MAX_CHARS = 20;
const RECENT_POSTS = 5;

interface MenuBarData {
  profile: ThreadsProfile;
  account: AccountInsights | null;
  posts: Array<{ post: ThreadsPost; insights: PostInsights | null }>;
  fetchedAt: Date;
}

async function loadMenuBarData(accessToken: string, periodDays: number): Promise<MenuBarData> {
  const { since, until } = periodWindow(periodDays);

  const [profile, account, { posts }] = await Promise.all([
    getProfile(accessToken),
    nullIfRefused(getAccountInsights(accessToken, since, until), (error) =>
      logger.error(`[analytics-menu-bar] Account insights unavailable`, { error: error.message }),
    ),
    getPosts(accessToken, { maxPosts: RECENT_POSTS }),
  ]);
  const insights = await mapWithConcurrency(posts, RECENT_POSTS, (post) => getPostInsights(accessToken, post.id));

  logger.log(`[analytics-menu-bar] Loaded`, { followers: account?.followersCount, posts: posts.length });

  return {
    profile,
    account,
    posts: posts.map((post, index) => ({ post, insights: insights[index] })),
    fetchedAt: new Date(),
  };
}

export default function Command() {
  const accessToken = getAccessToken();
  const { periodDays, titleMetric } = getMenuBarPreferences();

  const { data, isLoading, error, revalidate } = useCachedPromise(loadMenuBarData, [accessToken ?? "", periodDays], {
    execute: Boolean(accessToken),
    keepPreviousData: true,
    // Without an onError, @raycast/utils shows its own "Failed to fetch latest data"
    // toast on any non-background launch, on top of the one below. A background
    // refresh can show no toast at all, which is why the menu itself carries the
    // warning item.
    onError: (err) => {
      if (environment.launchType === LaunchType.UserInitiated) {
        void showApiError(err, { title: "Couldn't Refresh Threads Analytics" });
      }
    },
  });

  const ready = Boolean(accessToken) && !error;
  const display = TITLE_METRICS[titleMetric];
  const tooltip = !accessToken
    ? MISSING_TOKEN_TITLE
    : error
      ? describeApiError(error, "Couldn't Refresh Threads Analytics").title
      : data
        ? `@${data.profile.username} · ${display.detail(data, periodDays)}`
        : "Threads Analytics";

  return (
    <MenuBarExtra
      icon={ready ? { source: "threads-icon.png" } : Icon.Warning}
      // No title at all rather than a bare "–": the menu bar has no room to explain
      // that a metric is unavailable, and the menu below already does.
      title={(ready && data ? display.title(data) : null) ?? undefined}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {!accessToken ? (
        <MenuBarExtra.Item
          icon={Icon.Key}
          title={MISSING_TOKEN_TITLE}
          onAction={() => void openExtensionPreferences()}
        />
      ) : null}

      {error ? <ErrorItem error={error} onRetry={revalidate} /> : null}

      {data ? (
        <MenuBarExtra.Section title={`@${data.profile.username}`}>
          <MetricItem icon={Icon.TwoPeople} title="Followers" value={data.account?.followersCount ?? null} />
        </MenuBarExtra.Section>
      ) : null}

      {data ? (
        <MenuBarExtra.Section title={`Last ${periodDays} Days`}>
          <MetricItem icon={Icon.Eye} title="Views" value={data.account?.views ?? null} />
          <MetricItem icon={Icon.Heart} title="Likes" value={data.account?.likes ?? null} />
          <MetricItem icon={Icon.Reply} title="Replies" value={data.account?.replies ?? null} />
          <MetricItem icon={Icon.Repeat} title="Reposts" value={data.account?.reposts ?? null} />
          <MetricItem icon={Icon.QuoteBlock} title="Quotes" value={data.account?.quotes ?? null} />
        </MenuBarExtra.Section>
      ) : null}

      {data && data.posts.length > 0 ? (
        <MenuBarExtra.Section title="Recent Posts">
          {data.posts.map(({ post, insights }) => (
            <MenuBarExtra.Item
              key={post.id}
              icon={Icon.Document}
              title={postTitle(post.text)}
              subtitle={
                insights
                  ? `${countOf(insights.views, "view")} · ${countOf(insights.likes, "like")} · ${countOf(insights.replies, "reply")}`
                  : "Insights unavailable"
              }
              tooltip={formatDateTime(post.timestamp)}
              onAction={() => void open(post.permalink || `${THREADS_BASE_URL}/@${data.profile.username}`)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.BarChart}
          title="Open Analytics"
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => void openAnalyticsCommand()}
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          subtitle={data ? `Updated ${formatDateTime(data.fetchedAt)}` : undefined}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Open Extension Preferences"
          shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
          onAction={() => void openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/**
 * A background refresh cannot toast, so the failure has to live in the menu. Anything
 * the user fixes in preferences opens them; anything else, a rate limit included,
 * offers a retry.
 */
function ErrorItem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { title, message, fixInPreferences } = describeApiError(error, "Couldn't Refresh");
  return (
    <MenuBarExtra.Item
      icon={isTokenExpired(error) ? Icon.Key : Icon.Warning}
      title={title}
      subtitle={message}
      onAction={() => (fixInPreferences ? void openExtensionPreferences() : onRetry())}
    />
  );
}

function MetricItem({ icon, title, value }: { icon: Icon; title: string; value: number | null }) {
  return (
    <MenuBarExtra.Item
      icon={icon}
      title={title}
      subtitle={formatNumber(value)}
      onAction={() => void openAnalyticsCommand()}
    />
  );
}

type TitleMetric = Preferences.AnalyticsMenuBar["titleMetric"];

interface MetricDisplay {
  /** Text for the menu bar itself, or `null` when there is nothing honest to show. */
  title: (data: MenuBarData) => string | null;
  /** What that text means, spelled out for the hover tooltip. */
  detail: (data: MenuBarData, periodDays: number) => string;
}

/**
 * One entry per dropdown option. A `Record` keyed on the union rather than a `switch`:
 * `noImplicitReturns` is off, so a `switch` missing a newly added option would
 * silently return `undefined` and pin a "–" in the menu bar.
 */
/** A withheld count reads "–", never "0 followers". */
const followersDetail = (data: MenuBarData) => `Followers: ${formatNumber(data.account?.followersCount ?? null)}`;

const TITLE_METRICS: Record<TitleMetric, MetricDisplay> = {
  followers: {
    title: (data) => compact(data.account?.followersCount),
    detail: followersDetail,
  },
  views: periodMetric("Views", (account) => account.views),
  likes: periodMetric("Likes", (account) => account.likes),
  replies: periodMetric("Replies", (account) => account.replies),
  latestPost: {
    title: (data) => {
      const latest = data.posts[0];
      if (!latest) return null;
      const text = postTitle(latest.post.text, { maxChars: MENU_BAR_TITLE_MAX_CHARS });
      if (!latest.insights) return text;
      const { views, likes, replies } = latest.insights;
      // Compact, and unlabelled: the menu bar has no room for "views · likes ·
      // replies", and the tooltip spells all three out.
      return `${text} · ${formatCompact(views)} · ${formatCompact(likes)} · ${formatCompact(replies)}`;
    },
    detail: (data) => {
      const latest = data.posts[0];
      if (!latest) return "No posts yet";
      if (!latest.insights) return "Latest post · insights unavailable";
      const { views, likes, replies } = latest.insights;
      return `Latest post · ${countOf(views, "view")} · ${countOf(likes, "like")} · ${countOf(replies, "reply")}`;
    },
  },
  none: { title: () => null, detail: followersDetail },
};

function periodMetric(label: string, pick: (account: AccountInsights) => number): MetricDisplay {
  const value = (data: MenuBarData) => (data.account ? pick(data.account) : null);
  return {
    title: (data) => compact(value(data)),
    detail: (data, periodDays) => `${label} in the last ${countOf(periodDays, "day")}: ${formatNumber(value(data))}`,
  };
}

/** A metric the API withheld has no menu bar text at all, rather than a dash. */
function compact(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : formatCompact(value);
}

/**
 * Command preferences, each with a fallback: a preference added in a later version
 * reads as `undefined` until Raycast is restarted, whatever the generated type says.
 */
function getMenuBarPreferences(): { periodDays: number; titleMetric: TitleMetric } {
  const { period, titleMetric } = getPreferenceValues<Preferences.AnalyticsMenuBar>();
  const days = Number.parseInt(period, 10);
  return {
    periodDays: Number.isInteger(days) && days > 0 ? days : DEFAULT_PERIOD_DAYS,
    titleMetric: titleMetric in TITLE_METRICS ? titleMetric : "followers",
  };
}

async function openAnalyticsCommand() {
  try {
    await launchCommand({ name: "analytics", type: LaunchType.UserInitiated });
  } catch (error) {
    // The Analytics command may be disabled in Raycast; the web insights page is the next best thing.
    logger.log(`[analytics-menu-bar] launchCommand failed, opening threads.com instead`, {
      error: error instanceof Error ? error.message : String(error),
    });
    await open(`${THREADS_BASE_URL}/insights`);
  }
}
