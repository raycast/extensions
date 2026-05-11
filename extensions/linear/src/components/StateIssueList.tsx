import { IssuePriorityValue, User } from "@linear/sdk";
import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { groupBy, uniqBy } from "lodash";

import { IssueResult } from "../api/getIssues";
import { getOrderedStates, StateType } from "../helpers/states";

import IssueListItem from "./IssueListItem";

type StateIssueListProps = {
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  issues: IssueResult[] | undefined;
  priorities: IssuePriorityValue[] | undefined;
  me: User | undefined;
};

export default function StateIssueList({ mutateList, issues, priorities, me }: StateIssueListProps) {
  if (!issues || (issues && issues.length === 0)) {
    return null;
  }

  const states = uniqBy(
    issues.map((issue) => issue.state),
    (state) => state.id,
  );

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
              <IssueListItem issue={issue} key={issue.id} mutateList={mutateList} priorities={priorities} me={me} />
            ))}
          </List.Section>
        );
      })}
    </>
  );
}
