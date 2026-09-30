import { List, ActionPanel, Action } from "@raycast/api";
import { RunModel } from "./types";
import { JSX } from "react";

interface JobRunsListItemProps {
  result: RunModel;
}

export const JobRunsListItem = ({ result }: JobRunsListItemProps): JSX.Element => {
  const item = result;
  return (
    <List.Item
      id={item.id.toString()}
      title={item.job.name}
      accessories={[{ text: item.finished_at_humanized }]}
      subtitle={`${item.status_humanized} ${
        item.status_humanized === "Success"
          ? "🎉"
          : item.status_humanized === "Error"
            ? "❌"
            : item.status_humanized === "Running"
              ? "🏃"
              : item.status_humanized === "Queued"
                ? "🕒"
                : ""
      }`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser url={item.href} title="Open in dbt Cloud" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
