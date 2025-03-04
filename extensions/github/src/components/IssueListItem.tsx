import { Action, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { IssueFieldsFragment, UserFieldsFragment } from "../generated/graphql";
import { getIssueAuthor, getIssueStatus } from "../helpers/issue";
import { useMyIssues } from "../hooks/useMyIssues";

import IssueActions from "./IssueActions";
import IssueDetail from "./IssueDetail";
import { SortActionProps } from "./SortAction";

type IssueListItemProps = {
  issue: IssueFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList: MutatePromise<IssueFieldsFragment[] | undefined> | ReturnType<typeof useMyIssues>["mutate"];
};

export default function IssueListItem({
  issue,
  viewer,
  mutateList,
  sortQuery,
  setSortQuery,
}: IssueListItemProps & SortActionProps) {
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

  if (issue.linkedBranches?.nodes?.length) {
    accessories.unshift({
      icon: { source: "branch.svg", tintColor: Color.SecondaryText },
      tooltip: issue.linkedBranches.nodes[0]?.ref?.name,
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
        <IssueActions {...{ issue, mutateList, viewer, sortQuery, setSortQuery }}>
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
