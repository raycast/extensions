import { Action, ActionPanel, List } from "@raycast/api";
import { formatDuration, intervalToDuration, subSeconds } from "date-fns";

import { useSummary } from "../hooks";

export const SummaryList: React.FC<Omit<SummaryItemProps, "title" | "range">> = (props) => {
  const summary = useSummary();

  return (
    <List.Section title="Stats Summary">
      {summary.data?.map(([key, range]) => (
        <SummaryItem key={key} title={key} range={range} {...props} />
      ))}
    </List.Section>
  );
};

const SummaryItem: React.FC<SummaryItemProps> = ({ range, setShowDetail, showDetail, title }) => {
  const md = [`## ${title}`];
  const props: Partial<List.Item.Props> = showDetail
    ? { detail: <List.Item.Detail markdown={md.join("\n\n")} /> }
    : {
        accessories: [
          {
            tooltip: "Cumulative Total",
            text: formatDuration(
              intervalToDuration({ start: subSeconds(new Date(), range.cummulative_total.seconds), end: new Date() })
            ),
          },
        ],
      };

  return (
    <List.Item
      {...props}
      title={title}
      actions={
        <ActionPanel>
          <Action title="Toggle Detail" onAction={() => setShowDetail(!showDetail)} />
        </ActionPanel>
      }
    />
  );
};

interface SummaryItemProps {
  title: string;
  range: WakaTime.Summary;
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
}
