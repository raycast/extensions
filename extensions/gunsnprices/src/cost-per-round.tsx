import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { computeCost, costRows, costSummary } from "./lib/cost.ts";

export default function Command(props: LaunchProps<{ arguments: Arguments.CostPerRound }>) {
  const result = computeCost(props.arguments.price, props.arguments.rounds);

  if ("error" in result) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Cannot Calculate Cost per Round" description={result.error} />
      </List>
    );
  }

  const summary = costSummary(result);
  return (
    <List searchBarPlaceholder="Filter results">
      <List.Section
        title={summary}
        subtitle={result.roundsFrom === "title" ? "Round count read from the title" : undefined}
      >
        {costRows(result).map((row) => (
          <List.Item
            key={row.label}
            title={row.value}
            subtitle={row.label}
            icon={Icon.Calculator}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Result" content={row.value} />
                <Action.CopyToClipboard title="Copy Exact Value" content={row.exact} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
