import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { overview } from "./api";
import { getAppHost, getConfig } from "./preferences";
import TaskDetail from "./task-detail";
import ManageSubtasks from "./subtasks";
import { statusIconFor, formatDue, subtasksAccessoryFor } from "./ui";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<
    Array<{
      user: { _id: string; name: string | null; email: string | null };
      tasks: any[];
    }>
  >([]);

  useEffect(() => {
    const cfg = getConfig();
    void (async () => {
      try {
        const data = await overview(cfg);
        setGroups(data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function refreshOverview() {
    try {
      const cfg = getConfig();
      const data = await overview(cfg);
      setGroups(data);
    } catch {
      /* ignore */
    }
  }

  function removeTask(taskId: string) {
    setGroups((current) =>
      current
        .map((group) => ({ ...group, tasks: group.tasks.filter((task) => task._id !== taskId) }))
        .filter((group) => group.tasks.length > 0),
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Overview">
      {groups.map((g) => (
        <List.Section key={g.user._id} title={g.user.name || g.user.email || g.user._id}>
          {g.tasks.map((t) => (
            <List.Item
              key={t._id}
              icon={statusIconFor(t)}
              title={t.title}
              subtitle={formatDue(t.dueDate)}
              accessories={
                [
                  subtasksAccessoryFor(t),
                  t.project?.name ? { tag: { value: t.project.name, color: "gray" } } : undefined,
                ].filter(Boolean) as any
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Task"
                    icon={Icon.Checkmark}
                    target={
                      <TaskDetail
                        task={
                          {
                            _id: t._id,
                            _creationTime: Date.now(),
                            title: t.title,
                            status: t.status,
                            projectId: t.project?._id,
                            projectName: t.project?.name ?? null,
                            assigneeId: t.assigneeId ?? null,
                            assigneeName: t.assigneeName ?? null,
                            dueDate: t.dueDate ?? null,
                            descriptionMarkdown: t.descriptionMarkdown ?? null,
                            hasSubtasks: t.hasSubtasks ?? false,
                          } as any
                        }
                        appHost={getAppHost()}
                        onUpdated={refreshOverview}
                        onDeleted={removeTask}
                      />
                    }
                  />
                  {t.hasSubtasks ? (
                    <Action.Push
                      title="Manage Subtasks"
                      icon={Icon.CheckList}
                      target={
                        <ManageSubtasks
                          task={
                            {
                              _id: t._id,
                              _creationTime: Date.now(),
                              title: t.title,
                              status: t.status,
                              projectId: t.project?._id,
                              projectName: t.project?.name ?? null,
                              assigneeId: t.assigneeId ?? null,
                              assigneeName: t.assigneeName ?? null,
                              dueDate: t.dueDate ?? null,
                              hasSubtasks: t.hasSubtasks ?? false,
                            } as any
                          }
                          onChanged={refreshOverview}
                        />
                      }
                    />
                  ) : null}
                  <Action.OpenInBrowser icon={Icon.Globe} url={`${getAppHost()}/task/${t._id}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
