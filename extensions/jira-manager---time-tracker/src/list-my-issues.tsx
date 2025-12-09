import { List, Color, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { searchIssues } from "./utils/jira";
import { getActiveIssue } from "./utils/storage";
import { IssueActions } from "./components/actions/IssueActions";

export default function Command() {
  const {
    data: issues,
    isLoading,
    revalidate,
  } = usePromise(searchIssues, ["assignee = currentUser() ORDER BY updated DESC"]);
  const { data: activeIssue, revalidate: revalidateActiveIssue } = usePromise(getActiveIssue);

  const [, setDummy] = useState(0); // Trigger re-render for timer

  useEffect(() => {
    if (activeIssue && activeIssue.isRunning) {
      const interval = setInterval(() => {
        setDummy((prev) => prev + 1);
      }, 1000); // Update every second
      return () => clearInterval(interval);
    }
  }, [activeIssue]);

  const getElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter your issues...">
      <List.EmptyView icon={Icon.CheckCircle} title="No issues found" description="You have no assigned issues." />
      {issues?.map((issue) => {
        const isActive = activeIssue?.issueKey === issue.key;
        return (
          <List.Item
            key={issue.id}
            title={issue.key}
            subtitle={issue.fields.summary}
            icon={issue.fields.issuetype.iconUrl}
            accessories={[
              isActive
                ? {
                    text: { value: `${getElapsedTime(activeIssue.startTime)}`, color: Color.Green },
                    tooltip: "Currently working on this issue",
                  }
                : { text: issue.fields.status.name },
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
        );
      })}
    </List>
  );
}
