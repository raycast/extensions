import { getPreferenceValues, List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { ASTaskItem } from "./components/ASTaskItem";
import { useState, useEffect, useCallback } from "react";
import { getProjects, getTasksByProjectId, ASSection } from "./lib/applescript";
import { useFirstRun } from "./lib/useFirstRun";

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();

// --- API mode ---

function InboxAPI() {
  useFirstRun();
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const inboxTasks = data.tasks.filter((t) => t.projectId === data.inboxId);

  return (
    <List isLoading={isLoading} navigationTitle="Inbox" searchBarPlaceholder="Filter inbox tasks...">
      {!data.inboxId && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not detect Inbox"
          description="TickTick did not return an inbox project via the API."
          actions={
            <ActionPanel>
              <Action
                title="Debug: Show Projects"
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: `${data.projects.length} projects`,
                    message: `inboxId=${data.inboxId || "?"}\n${data.projects
                      .map((p) => `${p.name} (${p.id}) [${p.kind ?? "-"}]`)
                      .join("\n")}`,
                  });
                }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : inboxTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Inbox is empty"
          description="No unorganised tasks."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Inbox · ${inboxTasks.length} task${inboxTasks.length !== 1 ? "s" : ""}`}>
          {inboxTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={data.projects}
              onComplete={revalidate}
              onDelete={revalidate}
              onRevalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// --- AppleScript mode ---

function InboxAppleScript() {
  useFirstRun();
  const [sections, setSections] = useState<ASSection[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setIsLoading(true);
    getProjects().then(async (projects) => {
      const inbox = projects.find((p) => p.name === "Inbox");
      if (!inbox) {
        setSections([]);
        setIsLoading(false);
        return;
      }
      const s = await getTasksByProjectId(inbox.id);
      setSections(s);
      setIsLoading(false);
    });
  }, [refreshKey]);

  const allTasks = sections?.flatMap((s) => s.children) ?? [];

  return (
    <List isLoading={isLoading} navigationTitle="Inbox" searchBarPlaceholder="Filter inbox tasks...">
      {!isLoading && allTasks.length === 0 ? (
        <List.EmptyView icon={Icon.Tray} title="Inbox is empty" description="No unorganised tasks." />
      ) : (
        sections?.map((section) => (
          <List.Section
            key={section.id}
            title={section.name}
            subtitle={`${section.children.length} task${section.children.length !== 1 ? "s" : ""}`}
          >
            {section.children.map((task) => (
              <ASTaskItem key={task.id} task={task} onRefresh={refresh} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

export default integrationMode === "applescript" ? InboxAppleScript : withAccessToken({ authorize })(InboxAPI);
