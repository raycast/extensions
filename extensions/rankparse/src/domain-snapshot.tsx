import { Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/client";
import { handleApiError } from "./lib/errors";
import type {
  CrawlHistoryData,
  DomainAuthorityData,
  DomainRankData,
  LinkAuditData,
  SiteExplorerData,
} from "./lib/types";

interface Arguments {
  domain: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const domain = props.arguments.domain.trim();

  const { data, isLoading } = usePromise(
    async (d: string) => {
      const client = getClient();
      const [authorityResult, rankResult, historyResult] = await Promise.allSettled([
        client.domainAuthority(d),
        client.domainRank(d),
        client.crawlHistory(d),
      ]);

      for (const result of [authorityResult, rankResult, historyResult]) {
        if (result.status === "rejected") handleApiError(result.reason);
      }

      return {
        authority: authorityResult.status === "fulfilled" ? authorityResult.value : undefined,
        rank: rankResult.status === "fulfilled" ? rankResult.value : undefined,
        history: historyResult.status === "fulfilled" ? historyResult.value : undefined,
      };
    },
    [domain],
  );

  const markdown = buildMarkdown(domain, isLoading, data?.authority?.data, data?.rank?.data, data?.history?.data);
  const creditsRemaining =
    data?.authority?.credits_remaining ?? data?.rank?.credits_remaining ?? data?.history?.credits_remaining;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={domain}
      metadata={
        data?.authority && data?.rank ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Authority Score" text={`${data.authority.data.score}/100`} />
            <Detail.Metadata.Label title="Referring Domains" text={`${data.authority.data.referring_domains}`} />
            <Detail.Metadata.Label title="Indexed Hosts" text={`${data.authority.data.total_host_count}`} />
            <Detail.Metadata.Label title="Inbound Edges" text={`${data.rank.data.inbound_edges}`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Registered" text={data.authority.data.registered_at ?? "Unknown"} />
            <Detail.Metadata.Label title="Registrar" text={data.authority.data.registrar ?? "—"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Credits Remaining" text={`${creditsRemaining ?? "—"}`} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Domain" url={`https://${domain}`} />
          <Action.Push
            title="Run Link Audit (8 Credits)"
            icon={Icon.Shield}
            target={<LinkAuditDetail domain={domain} />}
          />
          <Action.Push
            title="Run Site Explorer (10 Credits)"
            icon={Icon.Binoculars}
            target={<SiteExplorerDetail domain={domain} />}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  domain: string,
  isLoading: boolean,
  authority?: DomainAuthorityData,
  rank?: DomainRankData,
  history?: CrawlHistoryData,
) {
  if (isLoading && !authority && !rank) return `# ${domain}\n\nLoading…`;

  let md = `# ${domain}\n\n`;
  md += authority
    ? `**Authority Score:** ${authority.score}/100\n\n`
    : `**Authority Score:** unavailable (request failed)\n\n`;
  md += `Health score: ${authority?.health_score ?? "—"}/100 · Popularity rank: ${authority?.popularity_rank ?? "—"}\n\n`;

  if (rank) {
    md += `## Domain Rank Metrics\n\n`;
    md += `- Inbound edges: ${rank.inbound_edges}\n`;
    md += `- Unique linking domains: ${rank.unique_domains}\n`;
    md += `- Average linking host count: ${rank.avg_linking_host_count}\n\n`;
  }

  if (authority?.risk_flags.length) {
    md += `**Risk flags:** ${authority.risk_flags.join(", ")}\n\n`;
  }

  md += `## Crawl History\n\n`;
  if (history) {
    md += `- First seen: ${history.first_seen ?? "—"}\n`;
    md += `- Last seen: ${history.last_seen ?? "—"}\n`;
    md += `- Snapshots: ${history.total_snapshots}\n`;
    md += `- Source: ${history.source}\n`;
  } else {
    md += `No crawl history available for this domain.\n`;
  }

  return md;
}

function LinkAuditDetail({ domain }: { domain: string }) {
  const { data, isLoading } = usePromise(async (d: string) => getClient().linkAudit(d), [domain], {
    onError: handleApiError,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={renderLinkAudit(domain, data?.data)}
      navigationTitle={`${domain} — Link Audit`}
    />
  );
}

function renderLinkAudit(domain: string, audit?: LinkAuditData) {
  if (!audit) return `# ${domain} — Link Audit\n\nLoading…`;

  let md = `# ${domain} — Link Audit\n\n`;
  md += `- Health score: ${audit.health_score}/100\n`;
  md += `- Link quality: ${audit.link_quality.high} high · ${audit.link_quality.medium} medium · ${audit.link_quality.low} low (${audit.link_quality.total} total)\n`;
  md += `- Outbound destinations: ${audit.outbound_summary.unique_destinations}\n`;
  md += `- Top outbound domain: ${audit.outbound_summary.top_domain ?? "—"}\n\n`;

  if (audit.risk_flags.length > 0) md += `**Risk flags:** ${audit.risk_flags.join(", ")}\n\n`;

  const anchorRows = Object.entries(audit.anchor_profile).map(
    ([kind, share]) => `| ${kind} | ${(share * 100).toFixed(1)}% |`,
  );
  if (anchorRows.length > 0) {
    md += `## Anchor Profile\n\n| Type | Share |\n|---|---|\n${anchorRows.join("\n")}\n\n`;
  }

  if (audit.top_backlinks.length > 0) {
    md += `## Top Backlinks\n\n| Domain | Score | Type | Quality |\n|---|---:|---|---|\n`;
    md += audit.top_backlinks
      .slice(0, 15)
      .map((row) => `| ${row.from_domain} | ${row.from_domain_score} | ${row.anchor_type} | ${row.link_quality} |`)
      .join("\n");
  }

  return md;
}

function SiteExplorerDetail({ domain }: { domain: string }) {
  const { data, isLoading } = usePromise(async (d: string) => getClient().siteExplorer(d), [domain], {
    onError: handleApiError,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={renderSiteExplorer(domain, data?.data)}
      navigationTitle={`${domain} — Site Explorer`}
    />
  );
}

function renderSiteExplorer(domain: string, explorer?: SiteExplorerData) {
  if (!explorer) return `# ${domain} — Site Explorer\n\nLoading…`;

  let md = `# ${domain} — Site Explorer\n\n`;
  md += `**Authority score:** ${explorer.authority.score}/100 · **Backlinks returned:** ${explorer.backlinks_total}\n\n`;

  md += `## Top Pages\n\n| Page | Inbound Links | Referring Domains |\n|---|---:|---:|\n`;
  md += explorer.top_pages.length
    ? explorer.top_pages
        .map((row) => `| [${row.url}](${row.url}) | ${row.inbound_links} | ${row.referring_domains} |`)
        .join("\n")
    : `| _No top pages returned_ | — | — |`;

  md += `\n\n## Anchor Text\n\n| Anchor | Links | Domains |\n|---|---:|---:|\n`;
  md += explorer.anchor_text.length
    ? explorer.anchor_text
        .map((row) => `| ${row.anchor_text || "(empty)"} | ${row.link_count} | ${row.domain_count} |`)
        .join("\n")
    : `| _No anchor text returned_ | — | — |`;

  return md;
}
