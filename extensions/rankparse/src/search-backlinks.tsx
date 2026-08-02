import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BacklinkListItem } from "./components/backlink-item";
import { getClient } from "./lib/client";
import { handleApiError } from "./lib/errors";
import type {
  AnchorTextRow,
  ApiResponse,
  BacklinkRow,
  OutboundLinkRow,
  ReferringDomainRow,
  TopPageRow,
} from "./lib/types";

type ResourceKey = "backlinks" | "referring-domains" | "outbound-links" | "anchor-text" | "top-pages";

const RESOURCES: { key: ResourceKey; title: string }[] = [
  { key: "backlinks", title: "Backlinks" },
  { key: "referring-domains", title: "Referring Domains" },
  { key: "outbound-links", title: "Outbound Links" },
  { key: "anchor-text", title: "Anchor Text" },
  { key: "top-pages", title: "Top Pages" },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [domain, setDomain] = useState("");
  const [resource, setResource] = useState<ResourceKey>("backlinks");

  // Debounce so we don't burn credits on every keystroke while the user types a domain.
  useEffect(() => {
    const timer = setTimeout(() => setDomain(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading } = usePromise(
    async (d: string, r: ResourceKey) => {
      if (!d) return undefined;
      const client = getClient();
      switch (r) {
        case "backlinks":
          return client.backlinks(d, { limit: 100 });
        case "referring-domains":
          return client.referringDomains(d, { limit: 100 });
        case "outbound-links":
          return client.outboundLinks(d, { limit: 100 });
        case "anchor-text":
          return client.anchorText(d, { limit: 100 });
        case "top-pages":
          return client.topPages(d, { limit: 100 });
      }
    },
    [domain, resource],
    { onError: handleApiError },
  );

  const items = renderItems(resource, data);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Enter a domain, e.g. stripe.com"
      searchBarAccessory={
        <List.Dropdown tooltip="Resource" value={resource} onChange={(v) => setResource(v as ResourceKey)}>
          {RESOURCES.map((r) => (
            <List.Dropdown.Item key={r.key} title={r.title} value={r.key} />
          ))}
        </List.Dropdown>
      }
    >
      {!domain ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Enter a domain to search" />
      ) : items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No data returned"
          description={`No ${resource.replace("-", " ")} found for ${domain}.`}
        />
      ) : (
        <List.Section
          title={RESOURCES.find((r) => r.key === resource)?.title}
          subtitle={data ? `${data.total ?? items.length} results · ${data.credits_remaining} credits left` : undefined}
        >
          {items}
        </List.Section>
      )}
    </List>
  );
}

function renderItems(resource: ResourceKey, response: ApiResponse<unknown> | undefined) {
  if (!response) return [];
  switch (resource) {
    case "backlinks":
      return (response.data as BacklinkRow[]).map((row, i) => (
        <BacklinkListItem key={`${row.from_url}-${i}`} itemKey={`${row.from_url}-${i}`} row={row} />
      ));
    case "referring-domains":
      return (response.data as ReferringDomainRow[]).map((row, i) => (
        <List.Item
          key={`${row.from_domain}-${i}`}
          icon={Icon.Globe}
          title={row.from_domain}
          accessories={[{ text: `${row.total_links} links` }, { text: `${row.dofollow_links} dofollow` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Domain" url={`https://${row.from_domain}`} />
              <Action.CopyToClipboard title="Copy Domain" content={row.from_domain} />
            </ActionPanel>
          }
        />
      ));
    case "outbound-links":
      return (response.data as OutboundLinkRow[]).map((row, i) => (
        <List.Item
          key={`${row.to_url}-${i}`}
          icon={Icon.ArrowRight}
          title={row.to_domain}
          subtitle={row.anchor_text ?? "(no anchor text)"}
          accessories={[{ text: row.link_type ?? undefined }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Target Page" url={row.to_url} />
              <Action.CopyToClipboard title="Copy URL" content={row.to_url} />
            </ActionPanel>
          }
        />
      ));
    case "anchor-text":
      return (response.data as AnchorTextRow[]).map((row, i) => (
        <List.Item
          key={`${row.anchor_text}-${i}`}
          icon={Icon.Text}
          title={row.anchor_text || "(empty anchor text)"}
          accessories={[{ text: `${row.link_count} links` }, { text: `${row.domain_count} domains` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Anchor Text" content={row.anchor_text} />
            </ActionPanel>
          }
        />
      ));
    case "top-pages":
      return (response.data as TopPageRow[]).map((row, i) => (
        <List.Item
          key={`${row.url}-${i}`}
          icon={Icon.Document}
          title={row.url}
          subtitle={row.url}
          accessories={[{ text: `${row.inbound_links} backlinks` }, { text: `${row.referring_domains} domains` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Page" url={row.url} />
              <Action.CopyToClipboard title="Copy URL" content={row.url} />
            </ActionPanel>
          }
        />
      ));
  }
}
