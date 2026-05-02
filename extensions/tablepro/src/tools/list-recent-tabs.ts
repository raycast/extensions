import { RecentTab } from "../lib/types";
import { listRecentTabs } from "../lib/mcp";

export default async function tool(): Promise<RecentTab[]> {
  return listRecentTabs();
}
