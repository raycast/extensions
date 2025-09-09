import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { temboAPI, TEMBO_UI_BASE, type Issue } from "./api";
import { getIssueStatus, getIssueIntegrationType, getIssueRepo, getIntegrationIcon } from "./issue-utils";

async function fetchIssues(): Promise<Issue[]> {
  try {
    const issues = await temboAPI.getIssues({
      // Limit for menu bar
      pageSize: 20,
    });

    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return issues;
  } catch (error) {
    console.error("Failed to fetch issues for menubar:", error);
    return [];
  }
}

export default function MenubarTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await fetchIssues();
      setIssues(data);
      setIsLoading(false);
    })();
  }, []);

  const activeIssues = issues.filter((issue) => {
    const status = getIssueStatus(issue);
    return status === "open" || status === "queued";
  });

  const failedIssues = issues.filter((issue) => getIssueStatus(issue) === "failed");

  const recentlyCompleted = issues.filter((issue) => {
    const status = getIssueStatus(issue);
    return (
      (status === "closed" || status === "merged") &&
      new Date(issue.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
  });

  const getIssueCount = () => {
    if (isLoading) return "⋯";
    return activeIssues.length.toString();
  };

  const getIssueTitle = (issue: Issue) => {
    const repo = getIssueRepo(issue);
    const repoName = repo.split("/").pop() || repo;
    return `${issue.title} (${repoName})`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <MenuBarExtra
      title={getIssueCount()}
      icon={{ source: "tembo-white-mark.png" }}
      isLoading={isLoading}
      tooltip={`${activeIssues.length} active issues`}
    >
      <MenuBarExtra.Section title="Active Issues">
        {activeIssues.length === 0 ? (
          <MenuBarExtra.Item title="No active issues" icon={Icon.Checkmark} />
        ) : (
          activeIssues.map((issue) => (
            <MenuBarExtra.Item
              key={issue.id}
              title={getIssueTitle(issue)}
              subtitle={`${getIssueRepo(issue)} • ${formatTimeAgo(issue.createdAt)}`}
              icon={getIntegrationIcon(getIssueIntegrationType(issue))}
              onAction={() => {
                const url = `${TEMBO_UI_BASE}/tasks/${issue.id}`;
                open(url);
              }}
            />
          ))
        )}
      </MenuBarExtra.Section>

      {failedIssues.length > 0 && (
        <MenuBarExtra.Section title="Failed Issues">
          {failedIssues.map((issue) => (
            <MenuBarExtra.Item
              key={issue.id}
              title={getIssueTitle(issue)}
              subtitle={`${getIssueRepo(issue)} • ${formatTimeAgo(issue.createdAt)}`}
              icon={getIntegrationIcon(getIssueIntegrationType(issue))}
              onAction={() => {
                const url = `${TEMBO_UI_BASE}/tasks/${issue.id}`;
                open(url);
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {recentlyCompleted.length > 0 && (
        <MenuBarExtra.Section title="Recently Completed">
          {recentlyCompleted.slice(0, 3).map((issue) => (
            <MenuBarExtra.Item
              key={issue.id}
              title={getIssueTitle(issue)}
              subtitle={`${getIssueRepo(issue)} • ${formatTimeAgo(issue.createdAt)}`}
              icon={getIntegrationIcon(getIssueIntegrationType(issue))}
              onAction={() => {
                const url = `${TEMBO_UI_BASE}/tasks/${issue.id}`;
                open(url);
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View All Issues"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => {
            open(TEMBO_UI_BASE);
          }}
        />
        <MenuBarExtra.Item
          title="Refresh Issues"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            setIsLoading(true);
            fetchIssues().then((data) => {
              setIssues(data);
              setIsLoading(false);
            });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
