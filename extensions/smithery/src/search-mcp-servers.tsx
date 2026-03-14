import { SmitheryServer } from "./api/types";
import { searchServers } from "./api/smithery";
import { McpListItem } from "./components/mcp/McpListItem";
import { SearchCommand } from "./components/SearchCommand";

function rankServers(left: SmitheryServer, right: SmitheryServer): number {
  const byUseCount = (right.useCount ?? 0) - (left.useCount ?? 0);
  if (byUseCount !== 0) {
    return byUseCount;
  }

  return Number(right.verified) - Number(left.verified);
}

export default function SearchMcpServers() {
  return (
    <SearchCommand<SmitheryServer>
      fetchFn={searchServers}
      rankComparator={rankServers}
      dedupKey={(server) => server.qualifiedName}
      errorLabel="Failed to fetch servers."
      strings={{
        searchBarPlaceholder: "Search 3,500+ MCP servers...",
        emptyTitlePopular: "No Servers Available",
        emptyTitleSearch: "No Servers Found",
        emptyDescriptionPopular: "Could not load popular servers right now.",
      }}
      renderItem={(server, isShowingDetail, onToggleDetail) => (
        <McpListItem
          key={server.qualifiedName}
          server={server}
          isShowingDetail={isShowingDetail}
          onToggleDetail={onToggleDetail}
        />
      )}
    />
  );
}
