import { useEffect, useState } from "react";
import { Detail, showToast, Toast } from "@raycast/api";
import { getSiteStats, SiteStats } from "./api-client";

export default function ViewStats() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const fetchedStats = await getSiteStats();
        setStats(fetchedStats);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch site stats");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const markdown = stats
    ? `
# Bento Site Statistics

- **Total Users**: ${stats.user_count}
- **Subscribers**: ${stats.subscriber_count}
- **Unsubscribers**: ${stats.unsubscribe_count}
`
    : "Loading...";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
