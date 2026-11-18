import { Action, ActionPanel, List, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useIssues } from "./hooks/useIssues";
import { useMemo, useState } from "react";
import CreateIssue from "./issue-create";
import { getIssueItemKey, IssueItem, IssueKind } from "./components/issues";
import { getIssueIcon } from "./utils/icons";
import { IssueCategory, IssueCategoryOptions } from "./domain/issue-category";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.IssueMine>();
  const [selectedCategory, setSelectedCategory] = useCachedState<IssueCategory>(
    "issues-category-filter",
    IssueCategory.All,
  );

  const effectiveFilters = useMemo(() => {
    if (selectedCategory === IssueCategory.All) {
      return {
        includeCreated: prefs.includeCreated ?? true,
        includeAssigned: prefs.includeAssigned ?? true,
        includeMentioned: prefs.includeMentioned ?? true,
        includeRecentlyClosed: prefs.includeRecentlyClosed ?? false,
      };
    }
    return {
      includeCreated: selectedCategory === IssueCategory.Created,
      includeAssigned: selectedCategory === IssueCategory.Assigned,
      includeMentioned: selectedCategory === IssueCategory.Mentioned,
      includeRecentlyClosed: prefs.includeRecentlyClosed ?? false,
    };
  }, [selectedCategory, prefs]);

  const [searchText, setSearchText] = useState<string>("");
  const { items, isLoading, pagination } = useIssues({ ...effectiveFilters, query: searchText });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search issues"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value as IssueCategory)}
        >
          {IssueCategoryOptions.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.name} value={option.value} />
          ))}
        </List.Dropdown>
      }
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
    >
      {items.length === 0 ? (
        <List.EmptyView
          icon={Icon.BulletPoints}
          title="No issues found"
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Create Issue"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<CreateIssue />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
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
