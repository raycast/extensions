import { List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchIssues, MetronIssue } from "./api";
import { IssueListItem } from "./components";

export default function SearchComicsCommand() {
  const [issues, setIssues] = useState<MetronIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!searchText.trim() || searchText.trim().length < 2) {
      setIssues([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const parts = searchText.trim().match(/^(.*?)(?:\s+#?(\d+))?$/);
        const seriesName = parts?.[1]?.trim() ?? searchText.trim();
        const issueNumber = parts?.[2] ?? undefined;
        const results = await searchIssues(seriesName, issueNumber);
        setIssues(results);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed.";
        await showToast({
          style: Toast.Style.Failure,
          title: "Search Error",
          message,
        });
        setIssues([]);
      } finally {
        setIsLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Comics"
      searchBarPlaceholder='Search by series name, e.g. "Gideon Falls" or "Batman 1"'
      onSearchTextChange={setSearchText}
      throttle={false}
    >
      {!hasSearched ? (
        <List.EmptyView
          icon="🔍"
          title="Search the Metron Database"
          description="Type a series name to get started. Add a number to find a specific issue."
        />
      ) : issues.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={`No issues found for "${searchText}". Try a broader search.`}
        />
      ) : (
        <List.Section
          title="Results"
          subtitle={`${issues.length} issue${issues.length !== 1 ? "s" : ""}`}
        >
          {issues.map((issue) => (
            <IssueListItem key={issue.id} issue={issue} showPublisher />
          ))}
        </List.Section>
      )}
    </List>
  );
}
