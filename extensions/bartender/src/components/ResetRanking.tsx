import { Action, Icon } from "@raycast/api";

export function ResetRanking(props: { onAction: () => Promise<void> }) {
  return <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={props.onAction} />;
}
