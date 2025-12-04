import { List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MoodEntry, loadEntries, Timeframe, filterEntriesByTimeframe } from "./lib/data";
import { generateMoodDistribution } from "./lib/charts";
import { generateSparkline } from "./lib/charts";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("last-month");
  const [isLoading, setIsLoading] = useState(true);

  async function reloadEntries() {
    setIsLoading(true);
    try {
      setEntries(await loadEntries());
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load mood entries" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reloadEntries();
  }, []);

  const filteredEntries = useMemo(() => filterEntriesByTimeframe(entries, timeframe), [entries, timeframe]);

  // Generate charts
  const sparklineSvg = useMemo(() => generateSparkline(filteredEntries), [filteredEntries]);
  const distributionSvg = useMemo(() => generateMoodDistribution(filteredEntries), [filteredEntries]);

  const TimeframeDropdown = (
    <List.Dropdown
      tooltip="Select Timeframe"
      onChange={(newValue) => setTimeframe(newValue as Timeframe)}
      value={timeframe}
    >
      <List.Dropdown.Item title="Last Week" value="last-week" />
      <List.Dropdown.Item title="Last Month" value="last-month" />
      <List.Dropdown.Item title="Last 3 Months" value="last-3-months" />
      <List.Dropdown.Item title="Last Year" value="last-year" />
      <List.Dropdown.Item title="All Time" value="all-time" />
    </List.Dropdown>
  );

  return (
    <List isLoading={isLoading} isShowingDetail={true} searchBarAccessory={TimeframeDropdown}>
      <List.Item
        title="Trend"
        detail={
          <List.Item.Detail
            markdown={
              filteredEntries.length > 0
                ? `## Mood Trend\n\n![Mood Trend Chart](${sparklineSvg})`
                : `## No mood entries for the selected timeframe\n\nRecord your mood or select a different timeframe.`
            }
          />
        }
      />
      <List.Item
        title="Distribution"
        detail={
          <List.Item.Detail
            markdown={
              filteredEntries.length > 0
                ? `## Mood Distribution\n\n![Mood Distribution Chart](${distributionSvg})`
                : `## No mood entries for the selected timeframe\n\nRecord your mood or select a different timeframe.`
            }
          />
        }
      />
    </List>
  );
}
