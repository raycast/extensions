import { useEffect, useState } from "react";
import { LoadingStatus } from "./models/loadingStatus";
import { DefichainStats } from "./models/defichainStats";
import { getStats } from "./api/ocean";
import { getStatsSummary } from "./utils/markdownUtil";

export function useStats() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [statsSummaryMarkdown, setStatsSummaryMarkdown] = useState<string>("### loading stats...");
  const [stats, setStats] = useState<DefichainStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const stats = await getStats();
        setStats(stats);
        setStatus("success");
        setStatsSummaryMarkdown(getStatsSummary(stats));
      } catch (error) {
        setStatus("failure");
        setStatsSummaryMarkdown("not available right now");
      }
    }
    fetchStats();
  }, []);

  return { status, statsSummaryMarkdown };
}
