import { List, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchIssues, getProjects, getFavoriteFilters } from "./utils/jira";
import { IssueActions } from "./components/actions/IssueActions";
import { getActiveIssue } from "./utils/storage";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState("filter:all-open");

  const getJql = () => {
    // Parse the filter value to determine if it's a project or filter type
    const isProjectFilter = filterValue.startsWith("project:");
    const selectedProject = isProjectFilter ? filterValue.replace("project:", "") : null;
    const filterType = isProjectFilter ? "all-open" : filterValue.replace("filter:", "");

    let baseJql = "";
    switch (filterType) {
      case "all-open":
        baseJql = "assignee = currentUser() AND created >= -30d ORDER BY created DESC";
        break;
      case "my-issues":
        baseJql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
        break;
      case "reported-by-me":
        baseJql = "reporter = currentUser() ORDER BY created DESC";
        break;
      case "done-recently":
        baseJql = "statusCategory = Done AND updated >= -7d ORDER BY updated DESC";
        break;
      case "backlog":
        baseJql = 'statusCategory in ("To Do") ORDER BY created DESC';
        break;
      default:
        baseJql = "assignee = currentUser() AND created >= -30d ORDER BY created DESC";
    }

    // Add project filter if a specific project is selected
    if (selectedProject && selectedProject !== "all") {
      const cleanBase = baseJql.split("ORDER BY")[0];
      const orderBy = baseJql.split("ORDER BY")[1] ? "ORDER BY" + baseJql.split("ORDER BY")[1] : "";
      baseJql = `(${cleanBase}) AND project = "${selectedProject}" ${orderBy}`;
    }

    if (searchText) {
      // When searching, expand the scope to search across all project issues
      // This allows finding backlog items and unassigned tasks
      const cleanBase = baseJql.split("ORDER BY")[0];
      const orderBy = baseJql.split("ORDER BY")[1] ? "ORDER BY" + baseJql.split("ORDER BY")[1] : "";

      // Search by issue key, summary (title), or description
      // Remove user-specific filters when searching to include backlog items
      const searchCondition = `(key = "${searchText}" OR summary ~ "${searchText}*" OR description ~ "${searchText}*")`;

      // If the filter is already broad (backlog, reported-by-me), keep it
      // Otherwise, expand to search all issues in the project
      if (filterType === "backlog" || filterType === "reported-by-me" || filterType === "done-recently") {
        return `(${cleanBase}) AND ${searchCondition} ${orderBy}`;
      } else {
        // For user-specific filters, when searching, include all issues but prioritize user's issues
        return `${searchCondition} ${orderBy}`;
      }
    }

    return baseJql;
  };

  const { data: issues, isLoading, revalidate } = usePromise(searchIssues, [getJql()]);
  const { data: projects } = usePromise(getProjects);
  const { data: favoriteFilters } = usePromise(getFavoriteFilters);
  const { data: activeIssue, revalidate: revalidateActiveIssue } = usePromise(getActiveIssue);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search issues..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Issues" onChange={setFilterValue} value={filterValue} storeValue>
          <List.Dropdown.Section title="Favorites">
            {favoriteFilters?.map((filter: { id: string; name: string; jql: string }) => (
              <List.Dropdown.Item key={filter.id} title={filter.name} value={`filter:${filter.jql}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Projects">
            <List.Dropdown.Item title="All Projects" value="filter:all-open" />
            {projects?.map((project) => (
              <List.Dropdown.Item key={project.id} title={project.name} value={`project:${project.key}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Filter Type">
            <List.Dropdown.Item title="Recent Issues" value="filter:all-open" />
            <List.Dropdown.Item title="Assigned to Me" value="filter:my-issues" />
            <List.Dropdown.Item title="Reported by Me" value="filter:reported-by-me" />
            <List.Dropdown.Item title="Done Recently" value="filter:done-recently" />
            <List.Dropdown.Item title="Backlog" value="filter:backlog" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No issues found"
        description="Try adjusting your search terms or filters."
      />
      {issues?.map((issue) => (
        <List.Item
          key={issue.id}
          title={issue.key}
          subtitle={issue.fields.summary}
          icon={issue.fields.issuetype.iconUrl}
          accessories={[
            { text: issue.fields.status.name },
            { text: issue.fields.assignee?.displayName || "Unassigned" },
          ]}
          actions={
            <IssueActions
              issue={issue}
              mutate={() => {
                revalidate();
                revalidateActiveIssue();
              }}
              activeIssue={activeIssue}
            />
          }
        />
      ))}
    </List>
  );
}
