// Claude desktop: sessions in the sidebar. Rows are titled "<status> <name>" (status: Running, Idle, a PR
// badge...); the open session is named by a "<name>, rename session" button above the transcript.

import { sidebarSource } from "./sidebar";

export const claude = sidebarSource({
  id: "claude",
  bundleId: "com.anthropic.claudefordesktop",
  kind: "session",
  container: "Sidebar",
  rowRole: "AXButton",
  format: "status-prefixed",
  activeSuffix: ", rename session",
});
