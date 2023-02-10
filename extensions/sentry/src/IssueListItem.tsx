import { List } from "@raycast/api";
import { Issue, Organization } from "./types";
import { Actions } from "./Actions";
import { getIcon, getKeywords, getAccessories } from "./utils";
import { MutatePromise } from "@raycast/utils";

export type IssueListItemProps = {
  issue: Issue;
  organization?: Organization;
  mutateList: MutatePromise<Issue[] | undefined>;
};

export function IssueListItem(props: IssueListItemProps) {
  return (
    <List.Item
      icon={getIcon(props.issue)}
      title={props.issue.title}
      subtitle={props.issue.shortId}
      keywords={getKeywords(props.issue)}
      accessories={getAccessories(props.issue)}
      actions={<Actions issue={props.issue} organization={props.organization} mutateList={props.mutateList} />}
    />
  );
}
