import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { WorkflowState, IssuePriorityValue, User } from "@linear/sdk";
import { groupBy } from "lodash";

import { IssueResult } from "../api/getIssues";

import { getOrderedStates, StateType } from "../helpers/states";

import IssueListItem from "./IssueListItem";

type StateIssueListProps = {
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  issues: IssueResult[] | undefined;
  states: WorkflowState[];
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
};

export default function StateIssueList({ mutateList, issues, states, priorities, me, users }: StateIssueListProps) {
  if (!issues?.length || !states?.length) {
    return null;
  }

  const orderedStates = getOrderedStates(states || [], [
    StateType.triage,
    StateType.started,
    StateType.unstarted,
    StateType.backlog,
    StateType.completed,
    StateType.canceled,
  ]);
  const groupedIssues = groupBy(issues, (issue) => issue.state.id);

  return (
    <>
      {orderedStates.map((state) => {
        const numberOfIssues =
          groupedIssues[state.id]?.length === 1 ? "1 issue" : `${groupedIssues[state.id]?.length} issues`;

        return (
          <List.Section title={state.name} key={state.id} subtitle={numberOfIssues}>
            {groupedIssues[state.id]?.map((issue) => (
              <IssueListItem
                issue={issue}
                key={issue.id}
                mutateList={mutateList}
                priorities={priorities}
                users={users}
                me={me}
              />
            ))}
          </List.Section>
        );
      })}
    </>
  );
}
