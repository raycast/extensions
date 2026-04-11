import { Detail, Icon, getPreferenceValues } from "@raycast/api";
import {
  getProgressIcon,
  showFailureToast,
  useCachedPromise,
} from "@raycast/utils";
import {
  getAuthMe,
  getLastQuota,
  getStats,
  handleApiError,
} from "./api/client";
import { WEBSTASH_DASHBOARD_URL } from "./constants";
import { isValidApiKey } from "./helpers/utils";
import { getInitialStats, setCachedStats } from "./shared-cache";
import type { AuthMeResponse, QuotaInfo, StatsResponse } from "./types";

interface StatsData {
  stats: StatsResponse;
  auth: AuthMeResponse;
  quota: QuotaInfo | null;
}

export default function LibraryStatsCommand() {
  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return (
      <Detail markdown="## Invalid API Key\n\nYour API key must start with `wsk_`. Open extension preferences to update it." />
    );
  }

  const { data, isLoading } = useCachedPromise(
    async (): Promise<StatsData> => {
      const [stats, auth] = await Promise.all([getStats(), getAuthMe()]);
      setCachedStats(stats);
      return { stats, auth, quota: getLastQuota() };
    },
    [],
    {
      initialData: buildInitialData(),
      keepPreviousData: true,
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) await showFailureToast("Failed to load stats");
      },
    },
  );

  const markdown = data ? buildMarkdown(data.stats) : "Loading...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={data ? <StatsMetadata data={data} /> : undefined}
    />
  );
}

function buildInitialData(): StatsData | undefined {
  const stats = getInitialStats();
  if (!stats) return undefined;
  return {
    stats,
    auth: { user: { id: "", email: "", name: null, plan: "free" } },
    quota: getLastQuota(),
  };
}

function buildMarkdown(stats: StatsResponse): string {
  const lines: string[] = ["# Library Stats\n"];

  if (stats.top_domains.length > 0) {
    lines.push("## Top Domains\n");
    lines.push("| Domain | Pages |");
    lines.push("|--------|------:|");
    for (const d of stats.top_domains) {
      lines.push(`| ${d.domain} | ${d.count} |`);
    }
    lines.push("");
  }

  if (stats.top_tags.length > 0) {
    lines.push("## Top Tags\n");
    lines.push("| Tag | Pages |");
    lines.push("|-----|------:|");
    for (const t of stats.top_tags) {
      lines.push(`| ${t.name} | ${t.count} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function StatsMetadata({ data }: { data: StatsData }) {
  const { stats, auth, quota } = data;
  const plan = auth.user.plan ?? "free";

  const pagesRatio = quota?.pages_limit
    ? quota.pages_used / quota.pages_limit
    : null;
  const aiRatio = quota?.ai_limit ? quota.ai_used / quota.ai_limit : null;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Plan"
        text={plan.charAt(0).toUpperCase() + plan.slice(1)}
        icon={plan === "pro" ? Icon.Star : Icon.Person}
      />
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Total Pages"
        text={String(stats.total_pages)}
      />
      <Detail.Metadata.Label
        title="Indexed"
        text={String(stats.total_indexed)}
      />
      <Detail.Metadata.Label
        title="Favorites"
        text={String(stats.total_favorites)}
        icon={Icon.Heart}
      />
      <Detail.Metadata.Label
        title="Dead Links"
        text={String(stats.total_dead_links)}
        icon={Icon.Warning}
      />
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Pages This Week"
        text={String(stats.pages_this_week)}
      />
      <Detail.Metadata.Label
        title="Pages This Month"
        text={String(stats.pages_this_month)}
      />
      {stats.total_collections !== undefined && (
        <Detail.Metadata.Label
          title="Collections"
          text={String(stats.total_collections)}
        />
      )}
      <Detail.Metadata.Separator />

      {quota && (
        <>
          <Detail.Metadata.Label
            title="Pages Quota"
            text={
              quota.pages_limit
                ? `${quota.pages_used} / ${quota.pages_limit}`
                : `${quota.pages_used}`
            }
            icon={pagesRatio !== null ? getProgressIcon(pagesRatio) : undefined}
          />
          <Detail.Metadata.Label
            title="AI Queries"
            text={
              quota.ai_limit
                ? `${quota.ai_used} / ${quota.ai_limit}`
                : `${quota.ai_used}`
            }
            icon={aiRatio !== null ? getProgressIcon(aiRatio) : undefined}
          />
        </>
      )}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="Dashboard"
        text="Open WebStash"
        target={WEBSTASH_DASHBOARD_URL}
      />
    </Detail.Metadata>
  );
}
