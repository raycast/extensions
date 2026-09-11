import { List, Icon, ActionPanel, Action, Detail, Keyboard, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";
import { formatNumber, formatDate, extractAuthor, getAuthorUrl } from "./utils";
import { parseDropdownValue } from "./dropdown-utils";

type SortOption = "popularity" | "name";
type TransportFilter = "all" | "http" | "stdio";

// v0.1 API types
interface ServerRepository {
  url: string;
  source: string;
  id?: string;
}

interface ServerRemote {
  type: string;
  url: string;
}

interface ServerPackage {
  registry_name?: string;
  registryType?: string;
  name?: string;
  identifier?: string;
  version?: string;
  transport?: {
    type: string;
  };
}

interface ServerDefinition {
  $schema?: string;
  name: string;
  title?: string;
  description?: string;
  version?: string;
  websiteUrl?: string;
  repository?: ServerRepository;
  remotes?: ServerRemote[];
  packages?: ServerPackage[];
}

interface PulseMCPServerMeta {
  visitorsEstimateMostRecentWeek?: number;
  visitorsEstimateLastFourWeeks?: number;
  visitorsEstimateTotal?: number;
  isOfficial?: boolean;
}

interface PulseMCPVersionMeta {
  source?: string;
  status?: string;
  publishedAt?: string;
  updatedAt?: string;
  isLatest?: boolean;
}

interface ServerEntry {
  server: ServerDefinition;
  _meta?: {
    "com.pulsemcp/server"?: PulseMCPServerMeta;
    "com.pulsemcp/server-version"?: PulseMCPVersionMeta;
  };
}

interface PulseResponse {
  servers: ServerEntry[];
  metadata?: {
    nextCursor?: string;
    count?: number;
  };
}

const BASE_URL = "https://api.pulsemcp.com/v0.1";
const API_KEY = "ee8403eb-e9f7-4b10-8125-c821c14dce5d"; // eslint-disable-line no-secrets/no-secrets
const TENANT_ID = "pulsemcp-all";

function ServerDetail({ entry }: { entry: ServerEntry }) {
  const server = entry.server;
  const meta = entry._meta?.["com.pulsemcp/server"];
  const versionMeta = entry._meta?.["com.pulsemcp/server-version"];

  // Check for remotes and packages
  const hasRemotes = (server.remotes?.length ?? 0) > 0;
  const hasPackages = server.packages && server.packages.filter((p) => p.name || p.identifier).length > 0;

  // Get freshness color for updated date (needs Raycast Color, so kept here)
  const getFreshnessColor = (dateStr?: string) => {
    if (!dateStr) return null;
    const monthsDiff = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsDiff <= 3) return Color.Green;
    if (monthsDiff <= 6) return Color.Orange;
    return Color.Red;
  };

  // Build PulseMCP page URL from server name
  const pulsemcpUrl = `https://pulsemcp.com/servers/${encodeURIComponent(server.name)}`;
  const repoUrl = server.repository?.url;
  const websiteUrl = server.websiteUrl ?? repoUrl;
  const author = extractAuthor(repoUrl, server.name);
  const authorUrl = getAuthorUrl(repoUrl, server.name);

  // Build info section
  const infoItems = [
    server.version ? `**Version:** \`${server.version}\`` : null,
    author ? `**Author:** [${author}](${authorUrl})` : null,
    versionMeta?.publishedAt ? `**Published:** ${formatDate(versionMeta.publishedAt)}` : null,
    versionMeta?.updatedAt ? `**Updated:** ${formatDate(versionMeta.updatedAt)}` : null,
  ].filter(Boolean);

  // Build visitor stats (check for null/undefined, not truthiness, to show 0 values)
  const visitorStats = [
    meta?.visitorsEstimateTotal != null ? `**Total Visitors:** ${meta.visitorsEstimateTotal.toLocaleString()}` : null,
    meta?.visitorsEstimateLastFourWeeks != null
      ? `**Last 4 Weeks:** ${meta.visitorsEstimateLastFourWeeks.toLocaleString()}`
      : null,
    meta?.visitorsEstimateMostRecentWeek != null
      ? `**This Week:** ${meta.visitorsEstimateMostRecentWeek.toLocaleString()}`
      : null,
  ].filter(Boolean);

  const markdown = `
# ${server.title ?? server.name}

${server.description ?? ""}


${infoItems.length > 0 ? infoItems.join("\n\n") : ""}

${visitorStats.length > 0 ? visitorStats.join("\n\n") : ""}

${
  hasRemotes
    ? `---

## Remote Connection
${server
  .remotes!.map(
    (remote) => `
**${remote.type}**
\`${remote.url}\`
`,
  )
  .join("\n")}`
    : ""
}

${
  hasPackages
    ? `---

## Local Installation
${server
  .packages!.filter((pkg) => pkg.name || pkg.identifier)
  .map(
    (pkg) => `
**${pkg.registry_name ?? pkg.registryType}**: \`${pkg.name ?? pkg.identifier}\`${pkg.version ? ` (v${pkg.version})` : ""}${pkg.transport?.type ? ` — ${pkg.transport.type}` : ""}
`,
  )
  .join("\n")}`
    : ""
}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {websiteUrl && <Detail.Metadata.Link title="Homepage" target={websiteUrl} text="Open" />}
          {repoUrl && <Detail.Metadata.Link title="Source Code" target={repoUrl} text="GitHub" />}
          <Detail.Metadata.Link title="PulseMCP" target={pulsemcpUrl} text="View" />
          <Detail.Metadata.Separator />
          {/* Status Tags */}
          <Detail.Metadata.TagList title="Status">
            {meta?.isOfficial && (
              <Detail.Metadata.TagList.Item text="Official" color={Color.Green} icon="official-icon.svg" />
            )}
            {server.$schema && <Detail.Metadata.TagList.Item text="server.json" color={Color.Blue} />}
            {versionMeta?.updatedAt && (
              <Detail.Metadata.TagList.Item
                text={(() => {
                  const monthsDiff =
                    (new Date().getTime() - new Date(versionMeta.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
                  if (monthsDiff <= 3) return "Updated<3M";
                  if (monthsDiff <= 6) return "Updated>3M";
                  return "Updated>6M";
                })()}
                color={getFreshnessColor(versionMeta.updatedAt)}
              />
            )}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {websiteUrl && <Action.OpenInBrowser url={websiteUrl} title="Open Homepage" icon={Icon.Globe} />}
          {repoUrl && <Action.OpenInBrowser url={repoUrl} title="View Source Code" icon={Icon.Code} />}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              content={server.name}
              title="Copy Server Name"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {repoUrl && (
              <Action.CopyToClipboard
                content={repoUrl}
                title="Copy Source URL"
                icon={Icon.Link}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [transportFilter, setTransportFilter] = useState<TransportFilter>("all");

  const { data, isLoading, revalidate } = useFetch<PulseResponse>(
    `${BASE_URL}/servers?search=${encodeURIComponent(searchText)}&limit=50&version=latest`,
    {
      headers: {
        "X-API-Key": API_KEY,
        "X-Tenant-ID": TENANT_ID,
      },
      keepPreviousData: true,
    },
  );

  const servers = useMemo(() => {
    let list = data?.servers ?? [];

    // Filter by transport type
    if (transportFilter !== "all") {
      list = list.filter((entry) => {
        const remoteTransports = entry.server.remotes?.map((r) => r.type.toLowerCase()) ?? [];
        const packageTransports =
          entry.server.packages?.map((p) => p.transport?.type?.toLowerCase()).filter(Boolean) ?? [];
        const allTransports = [...new Set([...remoteTransports, ...packageTransports])];

        if (transportFilter === "http") {
          return allTransports.some((t) => t === "streamable-http" || t === "sse");
        }
        return allTransports.includes(transportFilter);
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.server.name ?? "").localeCompare(b.server.name ?? "");
      }
      // Default and popularity both sort by visitor count
      const aPopularity = a._meta?.["com.pulsemcp/server"]?.visitorsEstimateTotal ?? 0;
      const bPopularity = b._meta?.["com.pulsemcp/server"]?.visitorsEstimateTotal ?? 0;
      return bPopularity - aPopularity;
    });
  }, [data?.servers, sortBy, transportFilter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search MCP servers..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort & Filter"
          storeValue
          onChange={(value) => {
            const [type, val] = parseDropdownValue(value);
            if (type === "sort") {
              setSortBy(val as SortOption);
            } else if (type === "transport") {
              setTransportFilter(val as TransportFilter);
            }
          }}
        >
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="Most Popular" value="sort:popularity" icon={Icon.Person} />
            <List.Dropdown.Item title="Name (A-Z)" value="sort:name" icon={Icon.Text} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Filter by Transport">
            <List.Dropdown.Item title="All Transports" value="transport:all" icon={Icon.Globe} />
            <List.Dropdown.Item title="HTTP (Remote)" value="transport:http" icon={Icon.Network} />
            <List.Dropdown.Item title="stdio (Local)" value="transport:stdio" icon={Icon.Terminal} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {servers.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No Servers Found" : "Search MCP Servers"}
          description={searchText ? "Try a different search term" : "Start typing to search the PulseMCP registry"}
        />
      ) : (
        servers.map((entry) => {
          const server = entry.server;
          const meta = entry._meta?.["com.pulsemcp/server"];
          const subtitle = server.description ?? "";
          const truncatedSubtitle = subtitle.length > 50 ? `${subtitle.slice(0, 47)}...` : subtitle;
          const repoUrl = server.repository?.url;
          const websiteUrl = server.websiteUrl ?? repoUrl;

          // Get freshness info for list view
          const versionMeta = entry._meta?.["com.pulsemcp/server-version"];
          const getFreshnessTag = () => {
            if (!versionMeta?.updatedAt) return null;
            const monthsDiff =
              (new Date().getTime() - new Date(versionMeta.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsDiff <= 3) return { value: "Updated<3M", color: Color.Green };
            if (monthsDiff <= 6) return { value: "Updated>3M", color: Color.Orange };
            return { value: "Updated>6M", color: Color.Red };
          };
          const freshnessTag = getFreshnessTag();

          return (
            <List.Item
              key={server.name}
              title={server.title ?? server.name}
              subtitle={truncatedSubtitle}
              accessories={[
                ...(meta?.isOfficial ? [{ icon: "official-icon.svg", tooltip: "Official" }] : []),
                ...(freshnessTag
                  ? [
                      {
                        tag: freshnessTag,
                        tooltip: `Last updated: ${versionMeta?.updatedAt ? new Date(versionMeta.updatedAt).toLocaleDateString() : "Unknown"}`,
                      },
                    ]
                  : []),
                ...(meta?.visitorsEstimateTotal
                  ? [
                      {
                        icon: Icon.Person,
                        text: formatNumber(meta.visitorsEstimateTotal),
                        tooltip: `${meta.visitorsEstimateTotal.toLocaleString()} total visitors`,
                      },
                    ]
                  : []),
              ]}
              icon={Icon.Terminal}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<ServerDetail entry={entry} />} />
                  {websiteUrl && <Action.OpenInBrowser url={websiteUrl} title="Open Homepage" icon={Icon.Globe} />}
                  {repoUrl && <Action.OpenInBrowser url={repoUrl} title="View Source Code" icon={Icon.Code} />}
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      content={server.name}
                      title="Copy Server Name"
                      icon={Icon.Clipboard}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    {repoUrl && (
                      <Action.CopyToClipboard
                        content={repoUrl}
                        title="Copy Source URL"
                        icon={Icon.Link}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
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
