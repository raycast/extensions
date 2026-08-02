import { useState } from "react";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/client";
import { handleApiError } from "./lib/errors";
import type { CompetitorGapRow, DomainOverlapRow, LinkIntersectRow, SimilarDomainRow } from "./lib/types";

type ResourceKey = "domain-overlap" | "link-intersect" | "competitor-gap" | "similar-domains";

const RESOURCES: { key: ResourceKey; title: string; cost: number }[] = [
  { key: "domain-overlap", title: "Domain Overlap", cost: 5 },
  { key: "link-intersect", title: "Link Intersect", cost: 5 },
  { key: "competitor-gap", title: "Competitor Gap", cost: 5 },
  { key: "similar-domains", title: "Similar Domains", cost: 5 },
];

interface Query {
  resource: ResourceKey;
  domain: string;
  secondary: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [resource, setResource] = useState<ResourceKey>("domain-overlap");
  const [domainError, setDomainError] = useState<string | undefined>();
  const [secondaryError, setSecondaryError] = useState<string | undefined>();

  function validate(domain: string, secondary: string): boolean {
    let ok = true;
    if (!domain) {
      setDomainError("Required");
      ok = false;
    }
    if (resource !== "similar-domains") {
      if (!secondary) {
        setSecondaryError("Required");
        ok = false;
      } else if (resource === "domain-overlap") {
        const extra = secondary
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        if (extra.length < 1 || extra.length > 4) {
          setSecondaryError("Enter 1-4 additional domains (2-5 total, comma-separated)");
          ok = false;
        }
      }
    }
    return ok;
  }

  function handleSubmit(values: { domain: string; secondary: string }) {
    const domain = values.domain.trim();
    const secondary = values.secondary?.trim() ?? "";
    if (!validate(domain, secondary)) return false;
    push(<ResultsList query={{ resource, domain, secondary }} />);
    return true;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compare" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="resource" title="Comparison" value={resource} onChange={(v) => setResource(v as ResourceKey)}>
        {RESOURCES.map((r) => (
          <Form.Dropdown.Item key={r.key} title={`${r.title} (${r.cost} credits)`} value={r.key} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="domain"
        title={resource === "competitor-gap" ? "Your Domain" : "Domain"}
        placeholder="stripe.com"
        error={domainError}
        onChange={() => setDomainError(undefined)}
      />
      {resource !== "similar-domains" && (
        <Form.TextField
          id="secondary"
          title={secondaryFieldTitle(resource)}
          placeholder={resource === "domain-overlap" ? "paypal.com, shopify.com" : "ahrefs.com"}
          error={secondaryError}
          onChange={() => setSecondaryError(undefined)}
        />
      )}
      <Form.Description
        title="Note"
        text="Domain Overlap needs 2-5 domains total (comma-separated in the second field). All comparisons here cost 5 credits per run."
      />
    </Form>
  );
}

function secondaryFieldTitle(resource: ResourceKey) {
  switch (resource) {
    case "domain-overlap":
      return "Additional Domains (comma-separated)";
    case "link-intersect":
      return "Domain B";
    case "competitor-gap":
      return "Competitor Domain";
    default:
      return "Secondary Domain";
  }
}

function ResultsList({ query }: { query: Query }) {
  const { data, isLoading } = usePromise(
    async (q: Query) => {
      const client = getClient();
      switch (q.resource) {
        case "domain-overlap": {
          const domains = [
            q.domain,
            ...q.secondary
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean),
          ];
          return client.domainOverlap(domains, { limit: 100 });
        }
        case "link-intersect":
          return client.linkIntersect(q.domain, q.secondary, { limit: 100 });
        case "competitor-gap":
          return client.competitorGap(q.domain, q.secondary, { limit: 100 });
        case "similar-domains":
          return client.similarDomains(q.domain, { limit: 100 });
      }
    },
    [query],
    { onError: handleApiError },
  );

  const items = renderItems(query.resource, data);

  return (
    <List isLoading={isLoading} navigationTitle={RESOURCES.find((r) => r.key === query.resource)?.title}>
      {!isLoading && items.length === 0 ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="No overlap found" />
      ) : (
        <List.Section
          title="Results"
          subtitle={data ? `${data.total ?? items.length} results · ${data.credits_remaining} credits left` : undefined}
        >
          {items}
        </List.Section>
      )}
    </List>
  );
}

function renderItems(resource: ResourceKey, response: { data: unknown } | undefined) {
  if (!response) return [];
  switch (resource) {
    case "domain-overlap":
      return (response.data as DomainOverlapRow[]).map((row, i) => (
        <List.Item
          key={`${row.from_domain}-${i}`}
          icon={Icon.Globe}
          title={row.from_domain}
          accessories={[{ text: `${row.total_links} links` }, { text: `${row.targets_linked} targets` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Domain" url={`https://${row.from_domain}`} />
            </ActionPanel>
          }
        />
      ));
    case "link-intersect":
      return (response.data as LinkIntersectRow[]).map((row, i) => (
        <List.Item
          key={`${row.from_domain}-${i}`}
          icon={Icon.Link}
          title={row.from_domain}
          accessories={[{ text: `${row.total_links} links` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Domain" url={`https://${row.from_domain}`} />
            </ActionPanel>
          }
        />
      ));
    case "competitor-gap":
      return (response.data as CompetitorGapRow[]).map((row, i) => (
        <List.Item
          key={`${row.from_domain}-${i}`}
          icon={Icon.ArrowRight}
          title={row.from_domain}
          subtitle="Links to competitor but not you"
          accessories={[{ text: `${row.total_links} links` }, { text: `DA ${row.from_domain_score}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Domain" url={`https://${row.from_domain}`} />
            </ActionPanel>
          }
        />
      ));
    case "similar-domains":
      return (response.data as SimilarDomainRow[]).map((row, i) => (
        <List.Item
          key={`${row.similar_domain}-${i}`}
          icon={Icon.TwoPeople}
          title={row.similar_domain}
          accessories={[{ text: `${row.shared_linkers} shared linkers` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Domain" url={`https://${row.similar_domain}`} />
            </ActionPanel>
          }
        />
      ));
  }
}
