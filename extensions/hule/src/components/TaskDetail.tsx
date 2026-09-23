import { ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { PRIORITY_LABELS, getTask } from "../api/client";
import type { Task } from "../api/types";
import { listIcon, memberIcon, priorityColor, statusIcon, tagColor } from "../helpers/appearance";
import { dueLabel } from "../helpers/dates";
import { imageRefs, localImages } from "../helpers/images";
import { escapeMarkdown, richToMarkdown } from "../helpers/richText";
import type { HuleContext } from "../hooks/useHule";
import { TaskActions } from "./TaskActions";

/**
 * The task, read inside Raycast rather than in a browser tab. Body on the left,
 * the fields that decide what to do with it on the right — every one of them
 * editable from the same action panel the list carries.
 */
export function TaskDetail({
  task: initial,
  context,
  onChange,
}: {
  task: Task;
  context: HuleContext;
  onChange: () => void;
}) {
  // The row that opened this panel is a snapshot. Every action here writes to the
  // server and then refreshes BOTH sides — without the re-read the panel would
  // keep showing the status it was opened with while the toast said otherwise.
  const { data: fresh, revalidate } = useCachedPromise(getTask, [initial.id], { keepPreviousData: true });
  const task = fresh ?? initial;
  const refresh = () => {
    revalidate();
    onChange();
  };
  // A deleted task has nothing left to show: refresh the list that opened this
  // panel and go back to it, instead of re-reading an id the server no longer has.
  const { pop } = useNavigation();
  const leave = () => {
    onChange();
    pop();
  };

  const status = context.statusesOf(task.listId).find((s) => s.id === task.statusId);
  const list = context.listOf(task.listId);
  const workspace = context.workspaceOf(task.listId);
  const assignee = context.memberOf(task.workspaceId, task.assigneeId);
  const tags = context.bundle.tags.filter((tag) => task.tagIds.includes(tag.id));

  const refs = useMemo(() => imageRefs(task.description), [task.description]);
  const { data: images, isLoading } = useCachedPromise(localImages, [task.workspaceId, refs], {
    execute: refs.length > 0,
  });

  const body = richToMarkdown(task.description, images ?? {});
  // The title is task text like any other — one line, escaped.
  const markdown = `# ${escapeMarkdown(task.title.replace(/\s+/g, " "))}\n\n${body || "_No description._"}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={task.taskKey ?? task.title}
      metadata={
        <Detail.Metadata>
          {status && <Detail.Metadata.Label title="Status" text={status.label} icon={statusIcon(status)} />}
          <Detail.Metadata.TagList title="Priority">
            <Detail.Metadata.TagList.Item text={PRIORITY_LABELS[task.priority]} color={priorityColor(task.priority)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Due" text={dueLabel(task.dueDate) ?? "—"} />
          <Detail.Metadata.Label
            title="Assignee"
            text={assignee?.name ?? assignee?.email ?? "Nobody"}
            icon={assignee ? memberIcon(assignee) : undefined}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="List" text={list?.name ?? "—"} icon={listIcon(list)} />
          <Detail.Metadata.Label title="Workspace" text={workspace?.name ?? "—"} />
          {tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tagColor(tag.color)} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {task.taskKey && <Detail.Metadata.Label title="Key" text={task.taskKey} />}
          <Detail.Metadata.Label title="Updated" text={new Date(task.updatedAt).toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <TaskActions task={task} context={context} onChange={refresh} onDeleted={leave} />
        </ActionPanel>
      }
    />
  );
}
