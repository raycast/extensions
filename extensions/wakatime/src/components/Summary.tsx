import { List } from "@raycast/api";
import { formatDuration, intervalToDuration, subSeconds } from "date-fns";

import { useSummary } from "../hooks";

export function SummaryList() {
  const summary = useSummary();

  return (
    <List.Section title="Stats Summary">
      {summary.data?.map(([key, range]) => (
        <SummaryItem key={key} title={key} range={range} />
      ))}
    </List.Section>
  );
}

const SummaryItem: React.FC<{ title: string; range: WakaTime.Summary }> = ({ range, title }) => {
  return (
    <List.Item
      title={title}
      accessories={[
        {
          tooltip: "Cumulative Total",
          text: formatDuration(
            intervalToDuration({
              start: subSeconds(new Date(), range.cummulative_total.seconds),
              end: new Date(),
            })
          ),
        },
      ]}
    />
  );
};
