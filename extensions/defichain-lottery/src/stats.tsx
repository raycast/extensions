import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStats } from "./api";
import { statsToMarkdown, statsToDetails, Stats } from "./types/stats";

export default function Command() {
  const [stats, setStats] = useState<Stats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState<string>("*Defichain Lottery* Stats are loading...");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    if (stats == undefined) {
      getStats.loadData().then((loadedStats: Stats) => {
        setStats(loadedStats);
        statsToMarkdown(loadedStats).then((markdown) => {
          setText(markdown);
        });
        setDetails(statsToDetails(loadedStats));
      });
    }

    setIsLoading(false);
  }, []);

  return <Detail isLoading={isLoading} markdown={text} metadata={details} />;
}
