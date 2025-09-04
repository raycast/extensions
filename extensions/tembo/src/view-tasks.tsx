import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { temboAPI, type Issue } from "./api";
import {
  getIssueStatus,
  getIssueIntegrationType,
  getIssueRepo,
  getIssueSolutionsCount,
  getStatusIcon,
  getIntegrationIcon,
} from "./issue-utils";

type FilterType = "all" | "active" | "recently-done" | "queued" | "open" | "closed" | "merged" | "failed";

async function fetchIssues(): Promise<Issue[]> {
  try {
    const issues = await temboAPI.getIssues({
      pageSize: 50,
      taskView: "all",
    });

    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return issues;
  } catch (error) {
    console.error("Failed to fetch tasks:", error);

    if (error instanceof Error && error.message.includes("401")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: "Please check your API key in the extension preferences",
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return [];
  }
}

export default function ViewTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await fetchIssues();
      setIssues(data);
      setIsLoading(false);
    })();
  }, []);

  const getFilteredIssues = (issues: Issue[], filter: FilterType) => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case "active":
        return issues.filter((issue) => {
          const status = getIssueStatus(issue);
          return status === "open" || status === "queued";
        });
      case "recently-done":
        return issues.filter((issue) => {
          const status = getIssueStatus(issue);
          return (status === "closed" || status === "merged") && new Date(issue.createdAt) > oneWeekAgo;
        });
      case "queued":
        return issues.filter((issue) => getIssueStatus(issue) === "queued");
      case "open":
        return issues.filter((issue) => getIssueStatus(issue) === "open");
      case "closed":
        return issues.filter((issue) => getIssueStatus(issue) === "closed");
      case "merged":
        return issues.filter((issue) => getIssueStatus(issue) === "merged");
      case "failed":
        return issues.filter((issue) => getIssueStatus(issue) === "failed");
      default:
        return issues;
    }
  };

  const getFilteredAndSearchedIssues = () => {
    const filteredByStatus = getFilteredIssues(issues, activeFilter);

    if (!searchText.trim()) return filteredByStatus;

    const q = searchText.trim().toLowerCase();
    return filteredByStatus.filter((issue) => {
      const hay = [issue.title, getIssueRepo(issue), getIssueStatus(issue)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  };

  const filtered = getFilteredAndSearchedIssues();

  const getFilterTitle = (filter: FilterType) => {
    switch (filter) {
      case "active":
        return "Active Tasks";
      case "recently-done":
        return "Recently Completed";
      case "queued":
        return "Queued Tasks";
      case "open":
        return "Open Tasks";
      case "closed":
        return "Closed Tasks";
      case "merged":
        return "Merged Tasks";
      case "failed":
        return "Failed Tasks";
      default:
        return "All Tasks";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Tasks"
          storeValue={true}
          onChange={(value) => setActiveFilter(value as FilterType)}
        >
          <List.Dropdown.Item key="all" title="All Tasks" value="all" />
          <List.Dropdown.Item key="active" title="Active (Open + Queued)" value="active" />
          <List.Dropdown.Item key="recently-done" title="Recently Completed" value="recently-done" />
          <List.Dropdown.Item key="queued" title="Queued" value="queued" />
          <List.Dropdown.Item key="open" title="Open" value="open" />
          <List.Dropdown.Item key="closed" title="Closed" value="closed" />
          <List.Dropdown.Item key="merged" title="Merged" value="merged" />
          <List.Dropdown.Item key="failed" title="Failed" value="failed" />
        </List.Dropdown>
      }
    >
      <List.Section title={getFilterTitle(activeFilter)} subtitle={`${filtered.length} issues`}>
        {filtered.map((issue) => {
          const status = getIssueStatus(issue);
          const integrationType = getIssueIntegrationType(issue);
          const repo = getIssueRepo(issue);
          const solutionsCount = getIssueSolutionsCount(issue);
          const statusIcon = getStatusIcon(status);

          return (
            <List.Item
              key={issue.id}
              title={issue.title}
              icon={getIntegrationIcon(integrationType)}
              accessories={[
                {
                  text: repo,
                  tooltip: "Repository",
                },
                {
                  text: `${solutionsCount} solutions`,
                  tooltip: "Solutions",
                },
                {
                  date: new Date(issue.createdAt),
                  tooltip: "Created",
                },
                {
                  icon: statusIcon,
                  tooltip: "Status",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Tembo"
                    icon={Icon.Eye}
                    url={`http://localhost:3000/tasks/${issue.id}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
