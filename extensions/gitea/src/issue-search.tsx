import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getIssueItemKey, IssueItem, IssueKind } from "./components/issues";
import { useSearchIssues } from "./hooks/useSearchIssues";
import { getIssueIcon } from "./utils/icons";
import { parseSearchQuery } from "./utils/search-query";

const IssueSearchState = {
  Open: "open",
  Closed: "closed",
  All: "all",
} as const;
type IssueSearchState = (typeof IssueSearchState)[keyof typeof IssueSearchState];

type IssueSearchOptions = {
  state: IssueSearchState;
  owner?: string;
  repo?: string;
  query?: string;
};

export default function Command(props: { initialSearchText?: string }) {
  const [state, setState] = useCachedState<IssueSearchState>("issues-search-state", IssueSearchState.Open);
  const [searchText, setSearchText] = useState<string>(props.initialSearchText ?? "");

  const options = useMemo<IssueSearchOptions>(() => {
    const { query, owner, repo } = parseSearchQuery(searchText);
    return { state, owner, repo, query } as IssueSearchOptions & { query?: string };
  }, [searchText, state]);

  const { items, isLoading, pagination } = useSearchIssues(options);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search issues"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter issues"
          value={`state:${state}`}
          onChange={(value) => {
            setState(value.replace("state:", "") as IssueSearchState);
          }}
        >
          <List.Dropdown.Section title="State">
            <List.Dropdown.Item title="Open" value="state:open" />
            <List.Dropdown.Item title="Closed" value="state:closed" />
            <List.Dropdown.Item title="All" value="state:all" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {items.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No issues found" />
      ) : (
        items.map((issue) => (
          <IssueItem
            key={getIssueItemKey(issue, IssueKind.Issue)}
            item={issue}
            kind={IssueKind.Issue}
            icon={getIssueIcon(issue.state)}
          />
        ))
      )}
    </List>
  );
}
