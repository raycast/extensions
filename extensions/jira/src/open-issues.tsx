import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";

import { Issue } from "./api/issues";
import { Project, getProjects } from "./api/projects";
import { IssueListEmptyView } from "./components/IssueListEmptyView";
import IssueListFallback from "./components/IssueListFallback";
import IssueListItem from "./components/IssueListItem";
import StatusIssueList from "./components/StatusIssueList";
import { getProjectAvatar } from "./helpers/avatars";
import { withProjectFilter } from "./helpers/jql";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

const EMPTY_PROJECTS: Project[] = [];
const EMPTY_ISSUES: Issue[] = [];

type SprintLike = { id?: string; name?: string; state?: string };

type SprintInfo = { id: string; name: string; isActive: boolean };

function isSprintLike(value: unknown): value is SprintLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const sprint = value as Record<string, unknown>;
  return (
    typeof sprint.name === "string" &&
    typeof sprint.id !== "undefined" &&
    (sprint.state === "active" || sprint.state === "future" || sprint.state === "closed")
  );
}

function getIssueSprints(issue: { fields: Record<string, unknown> }): SprintInfo[] {
  const sprintMap = new Map<string, SprintInfo>();
  const fields = issue.fields;

  const addSprint = (sprint: SprintLike) => {
    if (!sprint.id || !sprint.name) return;
    const id = String(sprint.id);
    const existing = sprintMap.get(id);
    const isActive = sprint.state === "active";
    if (!existing) {
      sprintMap.set(id, { id, name: sprint.name, isActive });
    } else if (isActive) {
      sprintMap.set(id, { ...existing, isActive: true });
    }
  };

  const sprintField = fields.sprint;
  if (Array.isArray(sprintField)) {
    for (const item of sprintField) {
      if (isSprintLike(item)) addSprint(item);
    }
  } else if (isSprintLike(sprintField)) {
    addSprint(sprintField);
  }

  const closedSprints = fields.closedSprints as SprintLike[] | undefined;
  if (Array.isArray(closedSprints)) {
    for (const sprint of closedSprints) {
      if (sprint?.name) {
        addSprint(sprint);
      }
    }
  }

  // No generic Object.values loop here: mergeIssueSprintFields() in getIssues()
  // already consolidates all sprint sources (including Greenhopper custom fields)
  // into fields.sprint before the data reaches this component. Scanning all field
  // values would falsely match non-sprint objects (issuetype, priority, project, etc.)
  // that also have `id` and `name` properties.

  return [...sprintMap.values()];
}

export function isInActiveSprint(issue: { fields: Record<string, unknown> }): boolean {
  return getIssueSprints(issue).some((s) => s.isActive);
}

export function OpenIssues() {
  const [query, setQuery] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [cachedProject, setCachedProject] = useCachedState<Project | undefined>("open-issues-project");
  const {
    showActiveSprintIssues = false,
    showAllSprintsIssues = false,
    showBacklogIssues = false,
  } = getPreferenceValues<Preferences.OpenIssues>();
  const hasSectionSelection = showActiveSprintIssues || showAllSprintsIssues || showBacklogIssues;
  const showSplitSections = hasSectionSelection;
  const projectKey = cachedProject?.key;

  const getProjectsFetcher = useCallback((q: string) => getProjects(q), []);
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(getProjectsFetcher, [projectQuery], {
    execute: showSplitSections,
    keepPreviousData: true,
  });

  const projectList = projects ?? EMPTY_PROJECTS;

  // Single query to get ALL open issues. We classify into sections client-side
  // because Jira's sprint JQL is unreliable when sprints live in Greenhopper
  // custom fields (e.g. `sprint is EMPTY` can return issues that DO have sprints).
  const allIssuesJql = useMemo(
    () =>
      withProjectFilter(
        "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC",
        showSplitSections ? projectKey : undefined,
      ),
    [projectKey, showSplitSections],
  );

  // Also fetch the openSprints() query to reliably identify active sprint names.
  // This is the only JQL sprint function we can trust for IDENTIFYING which sprint
  // is active (even if it misses some issues due to custom field inconsistencies).
  const activeSprintJql = useMemo(
    () =>
      withProjectFilter(
        "assignee = currentUser() AND statusCategory != Done AND sprint in openSprints() ORDER BY updated DESC",
        projectKey,
      ),
    [projectKey],
  );

  const allIssuesOpts = useMemo(() => ({ keepPreviousData: true as const }), []);
  const activeSprintOpts = useMemo(
    () => ({ execute: showSplitSections, keepPreviousData: true as const }),
    [showSplitSections],
  );

  const { issues: allIssues, isLoading: isLoadingAll, mutate: mutateAll } = useIssues(allIssuesJql, allIssuesOpts);
  const { issues: jqlActiveIssues, isLoading: isLoadingActiveSprint } = useIssues(activeSprintJql, activeSprintOpts);

  if (!showSplitSections) {
    return <StatusIssueList issues={allIssues} isLoading={isLoadingAll} mutate={mutateAll} />;
  }

  // Step 1: Determine active sprint names from the openSprints() query result.
  // Issues returned by openSprints() share the active sprint. The sprint name
  // with the highest frequency among those issues is the active one.
  const jqlActiveIssueIds = new Set((jqlActiveIssues ?? []).map((i) => i.id));

  const activeSprintNames = new Set<string>();
  {
    const nameCounts = new Map<string, number>();
    for (const issue of jqlActiveIssues ?? []) {
      for (const sprint of getIssueSprints(issue as unknown as { fields: Record<string, unknown> })) {
        nameCounts.set(sprint.name, (nameCounts.get(sprint.name) ?? 0) + 1);
      }
    }
    const total = (jqlActiveIssues ?? []).length;
    if (total > 0) {
      const threshold = total * 0.5;
      for (const [name, count] of nameCounts) {
        if (count >= threshold) activeSprintNames.add(name);
      }
      if (activeSprintNames.size === 0) {
        let maxName = "";
        let maxCount = 0;
        for (const [name, count] of nameCounts) {
          if (count > maxCount) {
            maxCount = count;
            maxName = name;
          }
        }
        if (maxName) activeSprintNames.add(maxName);
      }
    }
  }

  // Step 2: Classify every issue into Active Sprint / per-sprint sections / Backlog.
  const activeSprintBucket: Issue[] = [];
  const sprintIssueMap = new Map<string, Issue[]>();
  const sprintActiveMap = new Map<string, boolean>();
  const backlogBucket: Issue[] = [];

  for (const issue of allIssues ?? EMPTY_ISSUES) {
    const issueFields = issue as unknown as { fields: Record<string, unknown> };
    const sprints = getIssueSprints(issueFields);

    if (sprints.length === 0) {
      backlogBucket.push(issue);
      continue;
    }

    // An issue is in the active sprint if:
    // - It was returned by `sprint in openSprints()` (jqlActiveIssueIds), OR
    // - Any of its sprints has state === "active", OR
    // - Any of its sprint names matches `activeSprintNames`
    const hasActiveSprint =
      jqlActiveIssueIds.has(issue.id) ||
      sprints.some((s) => s.isActive) ||
      sprints.some((s) => activeSprintNames.has(s.name));

    if (hasActiveSprint) {
      activeSprintBucket.push(issue);

      // Also bucket under the active sprint name in the All Sprints view
      for (const sprint of sprints) {
        if (sprint.isActive || activeSprintNames.has(sprint.name)) {
          const existing = sprintIssueMap.get(sprint.name) ?? [];
          sprintIssueMap.set(sprint.name, [...existing, issue]);
          sprintActiveMap.set(sprint.name, true);
        }
      }
    } else {
      // Not in active sprint — bucket under all sprint names
      for (const sprint of sprints) {
        const existing = sprintIssueMap.get(sprint.name) ?? [];
        sprintIssueMap.set(sprint.name, [...existing, issue]);
        if (!sprintActiveMap.has(sprint.name)) {
          sprintActiveMap.set(sprint.name, false);
        }
      }
    }
  }

  const sprintSections = [...sprintIssueMap.entries()]
    .map(([name, sectionIssues]) => [name, sectionIssues, sprintActiveMap.get(name) ?? false] as const)
    .sort(([a, , aActive], [b, , bActive]) => {
      if (aActive !== bActive) return aActive ? -1 : 1;
      return a.localeCompare(b);
    });

  const isSearching = projectQuery !== "";

  const handleProjectDropdownChange = useCallback(
    (key: string) => {
      setProjectQuery("");
      if (key === "") {
        if (cachedProject !== undefined) {
          setCachedProject(undefined);
        }
        return;
      }
      const next = projectList.find((p) => p.key === key);
      if (!next || cachedProject?.key === key) {
        return;
      }
      setCachedProject(next);
    },
    [cachedProject, projectList, setCachedProject],
  );

  const searchBarAccessory = useMemo(() => {
    if (!showSplitSections) {
      return null;
    }
    return (
      <List.Dropdown
        tooltip="Filter sprint sections by project"
        onChange={handleProjectDropdownChange}
        value={cachedProject?.key ?? ""}
        throttle
        isLoading={isLoadingProjects}
        onSearchTextChange={setProjectQuery}
      >
        <List.Dropdown.Item key="all-projects" title="All projects" value="" />
        {cachedProject && !isSearching ? (
          <List.Dropdown.Item
            key={cachedProject.key}
            title={`${cachedProject.name} (${cachedProject.key})`}
            value={cachedProject.key}
            icon={getProjectAvatar(cachedProject)}
          />
        ) : null}
        {projectList
          .filter((project) => (cachedProject && !isSearching ? project.id !== cachedProject.id : true))
          .map((project) => (
            <List.Dropdown.Item
              key={project.id}
              title={`${project.name} (${project.key})`}
              value={project.key}
              icon={getProjectAvatar(project)}
            />
          ))}
      </List.Dropdown>
    );
  }, [cachedProject, handleProjectDropdownChange, isLoadingProjects, isSearching, projectList, showSplitSections]);

  const showFallbackCommand = query.length > 0;
  return (
    <List
      isLoading={isLoadingAll || isLoadingActiveSprint || (showSplitSections && isLoadingProjects)}
      searchBarPlaceholder="Filter by key, summary, status, type, assignee or priority"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={searchBarAccessory}
    >
      {showActiveSprintIssues ? (
        <List.Section title="Active Sprint" subtitle={`${activeSprintBucket.length} issues`}>
          {activeSprintBucket.map((issue) => (
            <IssueListItem key={issue.id} issue={issue} mutate={mutateAll} />
          ))}
        </List.Section>
      ) : null}

      {showAllSprintsIssues
        ? sprintSections.map(([sprintName, sprintIssues, isActiveSprint]) => (
            <List.Section
              key={sprintName}
              title={`Sprint: ${sprintName}${isActiveSprint ? " (Active)" : ""}`}
              subtitle={`${sprintIssues.length} issues`}
            >
              {sprintIssues.map((issue) => (
                <IssueListItem key={`${sprintName}-${issue.id}`} issue={issue} mutate={mutateAll} />
              ))}
            </List.Section>
          ))
        : null}

      {showBacklogIssues ? (
        <List.Section title="Backlog" subtitle={`${backlogBucket.length} issues`}>
          {backlogBucket.map((issue) => (
            <IssueListItem key={issue.id} issue={issue} mutate={mutateAll} />
          ))}
        </List.Section>
      ) : null}

      {showFallbackCommand ? <IssueListFallback query={query} /> : null}

      <IssueListEmptyView />
    </List>
  );
}

export default withJiraCredentials(OpenIssues);
