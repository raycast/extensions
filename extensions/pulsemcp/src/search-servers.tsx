import { List, Icon, ActionPanel, Action, Detail, Keyboard, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";

type SortOption = "default" | "stars" | "downloads" | "name";

interface Remote {
  url_direct: string | null;
  url_setup: string | null;
  transport: string | null;
  authentication_method: string | null;
  cost: string | null;
}

interface MCPServer {
  name: string;
  url: string;
  external_url: string;
  short_description: string;
  source_code_url: string;
  github_stars: number;
  package_registry: string;
  package_name: string;
  package_download_count: number;
  EXPERIMENTAL_ai_generated_description: string;
  remotes: Remote[];
}

interface PulseResponse {
  servers: MCPServer[];
  total_count: number;
}

const BASE_URL = "https://api.pulsemcp.com/v0beta";

function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function ServerDetail({ server }: { server: MCPServer }) {
  const setupUrl = server.remotes?.find((r) => r.url_setup)?.url_setup;

  const markdown = `
# ${server.name}

${server.short_description ?? ""}

${server.EXPERIMENTAL_ai_generated_description ? `\n> 🤖 ${server.EXPERIMENTAL_ai_generated_description}` : ""}

${
  server.remotes?.length > 0
    ? `---

## 🔌 Connection Options
${server.remotes
  .map(
    (remote) => `
### ${remote.transport ?? "Unknown"}
- 🔐 **Auth:** ${remote.authentication_method ?? "None"}
- 💰 **Cost:** ${remote.cost ?? "Free"}${remote.url_direct ? `\n- 🔗 **URL:** \`${remote.url_direct}\`` : ""}
`,
  )
  .join("\n")}`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Homepage" target={server.external_url ?? server.url} text="Open" />
          <Detail.Metadata.Link title="Source Code" target={server.source_code_url} text="GitHub" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Stats"
            text={`⭐ ${formatNumber(server.github_stars)}${server.package_download_count ? `  ·  📥 ${formatNumber(server.package_download_count)}` : ""}`}
          />
          {server.package_registry && (
            <Detail.Metadata.TagList title="📦 Package">
              <Detail.Metadata.TagList.Item text={server.package_registry} color={Color.Orange} />
              {server.package_name && <Detail.Metadata.TagList.Item text={server.package_name} />}
            </Detail.Metadata.TagList>
          )}
          {server.remotes?.length > 0 && (
            <Detail.Metadata.TagList title="🔌 Transport">
              {[...new Set(server.remotes.map((r) => r.transport).filter(Boolean))].map((t) => (
                <Detail.Metadata.TagList.Item key={t} text={t as string} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={server.external_url ?? server.url} title="Open Homepage" icon={Icon.Globe} />
          <Action.OpenInBrowser url={server.source_code_url} title="View Source Code" icon={Icon.Code} />
          {setupUrl && <Action.OpenInBrowser url={setupUrl} title="Setup Guide" icon={Icon.Book} />}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              content={server.name}
              title="Copy Server Name"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              content={server.source_code_url}
              title="Copy Source URL"
              icon={Icon.Link}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const { data, isLoading, revalidate } = useFetch<PulseResponse>(
    `${BASE_URL}/servers?query=${encodeURIComponent(searchText)}&count_per_page=50`,
    {
      headers: {
        "User-Agent": "Raycast-PulseMCP/1.0",
      },
      keepPreviousData: true,
    },
  );

  const servers = useMemo(() => {
    const list = data?.servers ?? [];
    if (sortBy === "default") return list;

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "stars":
          return (b.github_stars ?? 0) - (a.github_stars ?? 0);
        case "downloads":
          return (b.package_download_count ?? 0) - (a.package_download_count ?? 0);
        case "name":
          return (a.name ?? "").localeCompare(b.name ?? "");
        default:
          return 0;
      }
    });
  }, [data?.servers, sortBy]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search MCP servers..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" storeValue onChange={(value) => setSortBy(value as SortOption)}>
          <List.Dropdown.Item title="Default" value="default" />
          <List.Dropdown.Item title="Most Stars" value="stars" icon={Icon.Star} />
          <List.Dropdown.Item title="Most Downloads" value="downloads" icon={Icon.Download} />
          <List.Dropdown.Item title="Name (A-Z)" value="name" icon={Icon.Text} />
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
        servers.map((server) => {
          const subtitle = server.short_description ?? "";
          const truncatedSubtitle = subtitle.length > 50 ? subtitle.slice(0, 47) + "..." : subtitle;
          const transports = [...new Set((server.remotes?.map((r) => r.transport) ?? []).filter(Boolean))];
          return (
            <List.Item
              key={server.name}
              title={server.name}
              subtitle={truncatedSubtitle}
              accessories={[
                ...(server.package_registry ? [{ tag: server.package_registry }] : []),
                ...transports.map((t) => ({ tag: { value: t as string, color: Color.Blue } })),
                ...(server.package_download_count
                  ? [
                      {
                        icon: Icon.Download,
                        text: formatNumber(server.package_download_count),
                        tooltip: `${server.package_download_count.toLocaleString()} Downloads`,
                      },
                    ]
                  : []),
                {
                  icon: Icon.Star,
                  text: formatNumber(server.github_stars),
                  tooltip: `${server.github_stars?.toLocaleString() ?? 0} GitHub Stars`,
                },
              ]}
              icon={Icon.Terminal}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<ServerDetail server={server} />} />
                  <Action.OpenInBrowser
                    url={server.external_url ?? server.url}
                    title="Open Homepage"
                    icon={Icon.Globe}
                  />
                  <Action.OpenInBrowser url={server.source_code_url} title="View Source Code" icon={Icon.Code} />
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      content={server.name}
                      title="Copy Server Name"
                      icon={Icon.Clipboard}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      content={server.source_code_url}
                      title="Copy Source URL"
                      icon={Icon.Link}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
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
