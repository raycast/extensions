import { useState } from "react";
import { Action, ActionPanel, Detail, Form, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/client";
import { handleApiError } from "./lib/errors";
import type { PagePerformanceData, PageSeoData, SiteHealthData, SitemapEntry, TechStackData } from "./lib/types";

type ResourceKey = "page-seo" | "page-performance" | "tech-stack" | "site-health" | "sitemap";

const RESOURCES: { key: ResourceKey; title: string; cost: number; inputKind: "url" | "domain" }[] = [
  { key: "page-seo", title: "Page SEO", cost: 3, inputKind: "url" },
  { key: "page-performance", title: "Page Performance", cost: 3, inputKind: "url" },
  { key: "tech-stack", title: "Tech Stack", cost: 2, inputKind: "domain" },
  { key: "site-health", title: "Site Health", cost: 2, inputKind: "domain" },
  { key: "sitemap", title: "Sitemap", cost: 2, inputKind: "domain" },
];

interface Query {
  resource: ResourceKey;
  target: string;
  strategy: "mobile" | "desktop";
}

export default function Command() {
  const { push } = useNavigation();
  const [resource, setResource] = useState<ResourceKey>("page-seo");
  const [targetError, setTargetError] = useState<string | undefined>();
  const current = RESOURCES.find((r) => r.key === resource)!;

  function handleSubmit(values: { target: string; strategy: string }) {
    const target = values.target.trim();
    if (!target) {
      setTargetError("Required");
      return false;
    }
    push(<ResultDetail query={{ resource, target, strategy: values.strategy as "mobile" | "desktop" }} />);
    return true;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Audit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="resource" title="Audit" value={resource} onChange={(v) => setResource(v as ResourceKey)}>
        {RESOURCES.map((r) => (
          <Form.Dropdown.Item key={r.key} title={`${r.title} (${r.cost} credits)`} value={r.key} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="target"
        title={current.inputKind === "url" ? "Full URL" : "Domain"}
        placeholder={current.inputKind === "url" ? "https://stripe.com/docs" : "stripe.com"}
        error={targetError}
        onChange={() => setTargetError(undefined)}
      />
      {resource === "page-performance" && (
        <Form.Dropdown id="strategy" title="Strategy" defaultValue="mobile">
          <Form.Dropdown.Item title="Mobile" value="mobile" />
          <Form.Dropdown.Item title="Desktop" value="desktop" />
        </Form.Dropdown>
      )}
    </Form>
  );
}

function ResultDetail({ query }: { query: Query }) {
  const { data, isLoading } = usePromise(
    async (q: Query) => {
      const client = getClient();
      switch (q.resource) {
        case "page-seo":
          return client.pageSeo(q.target);
        case "page-performance":
          return client.pagePerformance(q.target, { strategy: q.strategy });
        case "tech-stack":
          return client.techStack(q.target);
        case "site-health":
          return client.siteHealth(q.target);
        case "sitemap":
          return client.sitemap(q.target);
      }
    },
    [query],
    { onError: handleApiError },
  );

  const title = RESOURCES.find((r) => r.key === query.resource)?.title ?? "Result";
  const markdown = data ? renderMarkdown(query.resource, data.data, query.target) : `# ${title}\n\nLoading…`;
  const creditsRemaining = data?.credits_remaining;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${title} — ${query.target}`}
      metadata={
        creditsRemaining !== undefined ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Credits Remaining" text={`${creditsRemaining}`} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function renderMarkdown(resource: ResourceKey, data: unknown, target: string) {
  switch (resource) {
    case "page-seo":
      return renderPageSeo(data as PageSeoData);
    case "page-performance":
      return renderPagePerformance(data as PagePerformanceData);
    case "tech-stack":
      return renderTechStack(data as TechStackData);
    case "site-health":
      return renderSiteHealth(data as SiteHealthData);
    case "sitemap":
      return renderSitemap(target, data as SitemapEntry[]);
  }
}

function renderPageSeo(d: PageSeoData) {
  const title = d.title?.text ?? d.url;
  return [
    `# ${title}`,
    "",
    `**URL:** ${d.url}  `,
    `**Final URL:** ${d.final_url ?? "—"}  `,
    `**Status:** ${d.status_code ?? "—"}  `,
    `**Response time:** ${d.response_time_ms ?? "—"} ms`,
    "",
    `## Meta`,
    `- Title: ${d.title?.text ?? "—"} (${d.title?.length ?? 0} characters; ${d.title?.optimal ? "optimal" : "review"})`,
    `- Description: ${d.description?.text ?? "—"} (${d.description?.length ?? 0} characters; ${d.description?.optimal ? "optimal" : "review"})`,
    `- H1: ${d.headings?.h1?.join("; ") || "—"}`,
    `- Canonical: ${d.canonical?.url ?? "—"}`,
    `- Robots: ${d.robots?.raw ?? "—"}`,
    `- Language: ${d.language?.tag ?? "—"}`,
    `- Word Count: ${d.word_count ?? "—"}`,
    "",
    `## Open Graph`,
    `- OG Title: ${d.og?.title ?? "—"}`,
    `- OG Description: ${d.og?.description ?? "—"}`,
    `- OG Image: ${d.og?.image ?? "—"}`,
    "",
    `## Coverage`,
    `- Images: ${d.images?.total ?? "—"} total; ${d.images?.missing_alt ?? "—"} missing alt text`,
    `- Links: ${d.links?.internal ?? "—"} internal; ${d.links?.external ?? "—"} external`,
  ].join("\n");
}

function renderPagePerformance(d: PagePerformanceData) {
  const vitals = d.core_web_vitals;
  return [
    `# Page Performance (${d.strategy})`,
    "",
    `**Performance Score:** ${d.performance_score ?? "—"}/100`,
    `**Accessibility Score:** ${d.accessibility_score ?? "—"}/100`,
    `**SEO Score:** ${d.seo_score ?? "—"}/100`,
    "",
    `## Core Web Vitals`,
    `- LCP: ${vitals.lcp_ms ?? "—"} ms`,
    `- CLS: ${vitals.cls ?? "—"}`,
    `- INP: ${vitals.inp_ms ?? "—"} ms`,
    `- FCP: ${vitals.fcp_ms ?? "—"} ms`,
    `- TTFB: ${vitals.ttfb_ms ?? "—"} ms`,
    "",
    `CrUX field data: ${d.crux_data ? "available" : "not available"}`,
    `_Fetched at ${d.cached_at}_`,
  ].join("\n");
}

function renderTechStack(d: TechStackData) {
  const rows =
    d.technologies.length > 0
      ? d.technologies.map((t) => `| ${t.name} | ${t.category} | ${t.confidence} |`).join("\n")
      : "| _No technologies detected_ | | |";
  return [
    `# Tech Stack — ${d.domain}`,
    "",
    `**Server:** ${d.server ?? "—"}  `,
    `**X-Powered-By:** ${d.x_powered_by ?? "—"}  `,
    `**Response time:** ${d.response_time_ms} ms`,
    "",
    `| Technology | Category | Confidence |`,
    `|---|---|---|`,
    rows,
  ].join("\n");
}

function renderSiteHealth(d: SiteHealthData) {
  const checkRows = d.checks
    .map(
      (check) =>
        `| ${check.url} | ${check.status ?? "—"} | ${check.content_type ?? "—"} | ${check.response_time_ms ?? "—"} ms |`,
    )
    .join("\n");
  return [
    `# Site Health — ${d.domain}`,
    "",
    `- HTTPS enforced: ${d.https.enforced ? "yes" : "no"}`,
    `- HSTS: ${d.https.hsts ? "yes" : "no"}${d.https.hsts_max_age ? ` (max-age ${d.https.hsts_max_age})` : ""}`,
    `- WWW redirect: ${d.www_redirect.enabled ? `yes → ${d.www_redirect.target ?? "—"}` : "no"}`,
    `- Robots.txt: ${d.robots_txt.present ? "present" : "missing"}`,
    `- Robots disallow-all: ${d.robots_txt.disallow_all ? "yes" : "no"}`,
    `- Sitemap declared: ${d.robots_txt.sitemap_declared ? "yes" : "no"}`,
    "",
    `## Checks`,
    "",
    `| URL | Status | Content Type | Response |`,
    `|---|---:|---|---:|`,
    checkRows || "| — | — | — | — |",
    "",
    `## Security Headers`,
    `- X-Frame-Options: ${d.security_headers.x_frame_options ?? "—"}`,
    `- X-Content-Type-Options: ${d.security_headers.x_content_type_options ?? "—"}`,
    `- Content-Security-Policy: ${d.security_headers.content_security_policy ? "present" : "missing"}`,
    `- Strict-Transport-Security: ${d.security_headers.strict_transport_security ?? "—"}`,
    `- Referrer-Policy: ${d.security_headers.referrer_policy ?? "—"}`,
  ].join("\n");
}

function renderSitemap(domain: string, entries: SitemapEntry[]) {
  const rows = entries.length
    ? entries
        .slice(0, 100)
        .map((entry) => `| [${entry.url}](${entry.url}) | ${entry.lastmod ?? "—"} | ${entry.changefreq ?? "—"} |`)
        .join("\n")
    : "| _No sitemap URLs found_ | — | — |";
  return [
    `# Sitemap — ${domain}`,
    "",
    `**Pages returned:** ${entries.length}`,
    "",
    `| URL | Last modified | Change frequency |`,
    `|---|---|---|`,
    rows,
  ].join("\n");
}
