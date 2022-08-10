import { List } from "@raycast/api";
import { Issue } from "./types";
import { Actions } from "./Actions";
import { getIcon, getKeywords, getAccessories } from "./utils";

export function IssueListItem(props: { issue: Issue }) {
  return (
    <List.Item
      icon={getIcon(props.issue)}
      title={props.issue.title}
      subtitle={props.issue.shortId}
      keywords={getKeywords(props.issue)}
      accessories={getAccessories(props.issue)}
      actions={<Actions issue={props.issue} />}
    />
  );
}
