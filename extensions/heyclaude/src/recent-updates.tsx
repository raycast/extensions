import { createDiscoveryCommand } from "./discovery-command";

export default createDiscoveryCommand({
  kind: "recent",
  title: "Recent Updates",
  emptyTitle: "No recent updates found",
  emptyDescription:
    "The registry diff endpoint may be unavailable temporarily. Refresh or search the full registry.",
  searchPlaceholder: "Search recent HeyClaude updates...",
});
