import { useState } from "react";
import { List } from "@raycast/api";

import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";

import View from "./components/View";
import IssueListItem from "./components/IssueListItem";
import useSearchIssues from "./hooks/useSearchIssues";

function SearchIssues() {
  const [query, setQuery] = useState("");

  const { isLoading, data, mutate, pagination } = useSearchIssues(query);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const numberOfIssues = data?.length === 1 ? "1 issue" : `${data?.length} issues`;

  return (
    <List
      navigationTitle="Search issues"
      isLoading={isLoading || isLoadingPriorities || isLoadingMe}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Globally search issues across projects"
      pagination={pagination}
    >
      <List.Section title="Updated Recently" subtitle={numberOfIssues}>
        {data?.map((issue) => (
          <IssueListItem issue={issue} key={issue.id} mutateList={mutate} priorities={priorities} me={me} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchIssues />
    </View>
  );
}
