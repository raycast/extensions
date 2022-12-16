import { Action, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import {
  IssueFieldsFragment,
  SearchCreatedIssuesQuery,
  SearchOpenIssuesQuery,
  UserFieldsFragment,
} from "../generated/graphql";
import { getIssueAuthor, getIssueStatus } from "../helpers/issue";

import IssueActions from "./IssueActions";
import IssueDetail from "./IssueDetail";

type IssueListItemProps = {
  issue: IssueFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList:
    | MutatePromise<SearchCreatedIssuesQuery | undefined>
    | MutatePromise<SearchOpenIssuesQuery | undefined>
    | MutatePromise<IssueFieldsFragment[] | undefined>;
};

export default function IssueListItem({ issue, viewer, mutateList }: IssueListItemProps) {
  const updatedAt = new Date(issue.updatedAt);

  const author = getIssueAuthor(issue);
  const status = getIssueStatus(issue);

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
    {
      icon: author.icon,
      tooltip: `Author: ${author.text}`,
    },
  ];

  if (issue.comments.totalCount > 0) {
    accessories.unshift({
      text: `${issue.comments.totalCount}`,
      icon: Icon.Bubble,
    });
  }

  const keywords = [`${issue.number}`];

  if (issue.author?.login) {
    keywords.push(issue.author.login);
  }

  return (
    <List.Item
      key={issue.id}
      title={issue.title}
      subtitle={{ value: `#${issue.number}`, tooltip: `Repository: ${issue.repository.nameWithOwner}` }}
      icon={{ value: status.icon, tooltip: `Status: ${status.text}` }}
      keywords={keywords}
      accessories={accessories}
      actions={
        <IssueActions issue={issue} mutateList={mutateList} viewer={viewer}>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<IssueDetail initialIssue={issue} viewer={viewer} mutateList={mutateList} />}
          />
        </IssueActions>
      }
    />
  );
}
