import { Icon, MenuBarExtra, open, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { temboAPI, TEMBO_UI_BASE, type Issue } from "./api";
import { getIssueStatus, getIssueIntegrationType, getIssueRepo, getIntegrationIcon } from "./issue-utils";

const cache = new Cache();
const ISSUES_CACHE_KEY = "tasks";

export default function MenubarTasks() {
  const [issues, setIssues] = useState<Issue[]>(() => {
    const cachedData = cache.get(ISSUES_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : [];
  });

  const fetchIssues = async () => {
    try {
      const fetchedIssues = await temboAPI.getIssues({
        pageSize: 20,
      });

      fetchedIssues.sort((a, b) => {
        const aQueuedAt = a.lastQueuedAt ? new Date(a.lastQueuedAt).getTime() : 0;
        const bQueuedAt = b.lastQueuedAt ? new Date(b.lastQueuedAt).getTime() : 0;

        if (aQueuedAt !== bQueuedAt) {
          return bQueuedAt - aQueuedAt;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setIssues(fetchedIssues);
      cache.set(ISSUES_CACHE_KEY, JSON.stringify(fetchedIssues));
    } catch (error) {
      console.error("Failed to fetch issues for menubar:", error);
    }
  };

  useEffect(() => {
    fetchIssues();
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
    return activeIssues.length.toString();
  };

  const getIssueTitle = (issue: Issue) => {
    return `${issue.title}`;
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
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            fetchIssues();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
