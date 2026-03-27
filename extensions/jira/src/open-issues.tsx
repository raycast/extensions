import { getPreferenceValues, List } from "@raycast/api";

import { IssueListEmptyView } from "./components/IssueListEmptyView";
import IssueListFallback from "./components/IssueListFallback";
import IssueListItem from "./components/IssueListItem";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";
import { useState } from "react";

type SprintLike = { id?: string; name?: string; state?: string };

function getIssueSprintNames(issue: { fields: Record<string, unknown> }) {
  const sprintNames = new Set<string>();
  const fields = issue.fields;

  const directSprint = fields.sprint as SprintLike | undefined;
  if (directSprint?.name) {
    sprintNames.add(directSprint.name);
  }

  const closedSprints = fields.closedSprints as SprintLike[] | undefined;
  if (Array.isArray(closedSprints)) {
    for (const sprint of closedSprints) {
      if (sprint?.name) {
        sprintNames.add(sprint.name);
      }
    }
  }

  for (const value of Object.values(fields)) {
    if (!value) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isSprintLike(item) && item.name) {
          sprintNames.add(item.name);
        }
      }
      continue;
    }

    if (isSprintLike(value) && value.name) {
      sprintNames.add(value.name);
    }
  }

  return [...sprintNames];
}

function isSprintLike(value: unknown): value is SprintLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const sprint = value as Record<string, unknown>;
  return typeof sprint.name === "string" && typeof sprint.id !== "undefined" && typeof sprint.state === "string";
}

export function OpenIssues() {
  const [query, setQuery] = useState("");
  const {
    showActiveSprintIssues = false,
    showAllSprintsIssues = false,
    showBacklogIssues = false,
  } = getPreferenceValues<Preferences.OpenIssues>();
  const hasSectionSelection = showActiveSprintIssues || showAllSprintsIssues || showBacklogIssues;
  const showSplitSections = hasSectionSelection;
  const { issues, isLoading, mutate } = useIssues(
    "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC",
    {
      execute: !hasSectionSelection,
    },
  );
  const {
    issues: activeSprintIssues,
    isLoading: isLoadingActiveSprint,
    mutate: mutateActiveSprint,
  } = useIssues(
    "assignee = currentUser() AND statusCategory != Done AND sprint in openSprints() ORDER BY updated DESC",
    {
      execute: showSplitSections && showActiveSprintIssues,
    },
  );
  const {
    issues: allSprintsIssues,
    isLoading: isLoadingAllSprints,
    mutate: mutateAllSprints,
  } = useIssues("assignee = currentUser() AND statusCategory != Done AND sprint is not EMPTY ORDER BY updated DESC", {
    execute: showSplitSections && showAllSprintsIssues,
  });
  const {
    issues: backlogIssues,
    isLoading: isLoadingBacklog,
    mutate: mutateBacklog,
  } = useIssues("assignee = currentUser() AND statusCategory != Done AND sprint is EMPTY ORDER BY updated DESC", {
    execute: showSplitSections && showBacklogIssues,
  });

  if (!showSplitSections) {
    return <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} />;
  }

  const sprintIssueMap = new Map<string, typeof allSprintsIssues>();
  for (const issue of allSprintsIssues ?? []) {
    const sprintNames = getIssueSprintNames(issue as unknown as { fields: Record<string, unknown> });
    if (sprintNames.length === 0) {
      const existing = sprintIssueMap.get("Unknown Sprint") ?? [];
      sprintIssueMap.set("Unknown Sprint", [...existing, issue]);
      continue;
    }

    for (const sprintName of sprintNames) {
      const existing = sprintIssueMap.get(sprintName) ?? [];
      sprintIssueMap.set(sprintName, [...existing, issue]);
    }
  }
  const sprintSections = [...sprintIssueMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  const showFallbackCommand = query.length > 0;
  return (
    <List
      isLoading={isLoadingActiveSprint || isLoadingAllSprints || isLoadingBacklog}
      searchBarPlaceholder="Filter by key, summary, status, type, assignee or priority"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={{ keepSectionOrder: true }}
    >
      {showActiveSprintIssues ? (
        <List.Section title="Active Sprint" subtitle={`${activeSprintIssues?.length ?? 0} issues`}>
          {(activeSprintIssues ?? []).map((issue) => (
            <IssueListItem key={issue.id} issue={issue} mutate={mutateActiveSprint} />
          ))}
        </List.Section>
      ) : null}

      {showAllSprintsIssues
        ? sprintSections.map(([sprintName, sprintIssues]) => (
            <List.Section
              key={sprintName}
              title={`Sprint: ${sprintName}`}
              subtitle={`${sprintIssues?.length ?? 0} issues`}
            >
              {(sprintIssues ?? []).map((issue) => (
                <IssueListItem key={`${sprintName}-${issue.id}`} issue={issue} mutate={mutateAllSprints} />
              ))}
            </List.Section>
          ))
        : null}

      {showBacklogIssues ? (
        <List.Section title="Backlog" subtitle={`${backlogIssues?.length ?? 0} issues`}>
          {(backlogIssues ?? []).map((issue) => (
            <IssueListItem key={issue.id} issue={issue} mutate={mutateBacklog} />
          ))}
        </List.Section>
      ) : null}

      {showFallbackCommand ? <IssueListFallback query={query} /> : null}

      <IssueListEmptyView />
    </List>
  );
}

export default withJiraCredentials(OpenIssues);
