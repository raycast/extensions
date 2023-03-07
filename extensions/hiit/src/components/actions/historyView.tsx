import { Action, Icon } from "@raycast/api";
import { History } from "../history";

export function HistoryView() {
  return (
    <Action.Push title="History" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "h" }} target={<History />} />
  );
}
