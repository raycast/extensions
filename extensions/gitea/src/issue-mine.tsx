import { Action, ActionPanel, List, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useIssues } from "./hooks/useIssues";
import { useMemo, useState } from "react";
import CreateIssue from "./issue-create";
import { getIssueIcon } from "./utils/icons";
import type { Repository } from "./types/api";

type IssueCommandPreferences = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeRecentlyClosed: boolean;
};

enum IssueCategory {
  All = "all",
  Created = "created",
  Assigned = "assigned",
  Mentioned = "mentioned",
}

const categoryOptions = [
  { title: "All", value: IssueCategory.All },
  { title: "Created", value: IssueCategory.Created },
  { title: "Assigned", value: IssueCategory.Assigned },
  { title: "Mentioned", value: IssueCategory.Mentioned },
];

export default function Command() {
  const prefs = getPreferenceValues<IssueCommandPreferences>();
  const [selectedCategory, setSelectedCategory] = useCachedState<string>("issues-category-filter", IssueCategory.All);

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
          onChange={(value) => setSelectedCategory(value)}
        >
          {categoryOptions.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
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
          <List.Item
            key={issue.id || issue.number || issue.title || "issue"}
            title={issue.title || "[No Title]"}
            subtitle={issue.repository?.full_name || "[No Repository]"}
            icon={getIssueIcon(issue.state)}
            accessories={[
              {
                text: `#${issue.number ?? ""}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {issue.html_url && (
                    <Action.OpenInBrowser
                      title="Open Issue"
                      url={issue.html_url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  {issue.html_url && (
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={issue.html_url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  )}
                  {issue.number != null && (
                    <Action.CopyToClipboard title="Copy Issue Number" content={`#${issue.number}`} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {issue.repository?.full_name && (
                    <Action.Push
                      title="Create Issue"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<CreateIssue initialRepo={issue.repository as Repository} />}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
