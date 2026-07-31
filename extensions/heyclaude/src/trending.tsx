import { createDiscoveryCommand } from "./discovery-command";

export default createDiscoveryCommand({
  kind: "trending",
  title: "Trending",
  emptyTitle: "No trending entries yet",
  emptyDescription:
    "Trending signals may be unavailable temporarily. Refresh or search the full registry.",
  searchPlaceholder: "Search trending HeyClaude resources...",
});
