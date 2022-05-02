import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

import { useSummary } from "../hooks";
import { cumulateSummaryDuration, getDuration } from "../utils";

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
  const keys = ["categories", "editors", "languages", "projects"] as const;
  const [md] = useState([
    `## ${title}`,
    getDuration(range.cummulative_total.seconds),
    "---",
    ...keys
      .map((key) => [
        `### ${key[0].toUpperCase()}${key.slice(1)}`,
        ...cumulateSummaryDuration(range, key).map(([name, seconds]) => `- ${name} (**${getDuration(seconds)}**)`),
      ])
      .flat(),
  ]);

  const props: Partial<List.Item.Props> = showDetail
    ? { detail: <List.Item.Detail markdown={md.join("\n\n")} /> }
    : {
        accessories: [
          {
            tooltip: "Cumulative Total",
            text: getDuration(range.cummulative_total.seconds),
          },
        ],
      };

  return (
    <List.Item
      {...props}
      title={title}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Sidebar}
            onAction={() => setShowDetail(!showDetail)}
            title={showDetail ? "Hide Details" : "Show Details"}
          />
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
