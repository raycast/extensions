import { Detail, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import { formatDueDate } from "./dates";
import { ErrorActions } from "./error-actions";
import { TaskActions } from "./task-actions";
import type { TaskDetail as TaskDetailType, TaskStatus } from "./types";

function minutes(value: number | null) {
  if (!value) return "None";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function fileSize(value: number) {
  if (value < 1_000) return `${value} B`;
  if (value < 1_000_000) return `${Math.round(value / 1_000)} KB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

function escapeMarkdown(value: string) {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export function taskDetailMarkdown(detail: TaskDetailType) {
  const sections = [
    detail.description?.trim() || "_No description_",
    detail.comments.length
      ? `## Recent Comments\n\n${detail.comments
          .slice(0, 6)
          .map(
            (item) =>
              `**${item.actor?.name ?? "Kato"}** · ${dateTime(item.createdAt)}\n\n${item.comment ?? ""}`,
          )
          .join("\n\n---\n\n")}`
      : "## Recent Comments\n\n_No comments yet_",
    detail.files.length
      ? `## Files\n\n${detail.files
          .map((file) => {
            const name = escapeMarkdown(file.name);
            const label = file.url ? `[${name}](${file.url})` : name;
            const uploader = file.uploadedByProfile?.name
              ? ` · ${file.uploadedByProfile.name}`
              : "";
            return `- ${label} · ${fileSize(file.size)}${uploader}`;
          })
          .join("\n")}`
      : "## Files\n\n_No files attached_",
    detail.activity.length
      ? `## Recent Activity\n\n${detail.activity
          .filter((item) => item.action !== "comment")
          .slice(0, 8)
          .map(
            (item) =>
              `- ${item.actor?.name ?? "Kato"} · ${item.action.replaceAll("_", " ")} · ${dateTime(item.createdAt)}`,
          )
          .join("\n")}`
      : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}

export function TaskDetailView({ taskId }: { taskId: string }) {
  const [detail, setDetail] = useState<TaskDetailType>();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const [nextDetail, nextStatuses] = await Promise.all([
        katoApi.task(taskId),
        katoApi.statuses(),
      ]);
      setDetail(nextDetail);
      setStatuses(nextStatuses);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load task");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), [taskId]);
  const content = useMemo(
    () => (detail ? taskDetailMarkdown(detail) : ""),
    [detail],
  );

  if (error) {
    return (
      <Detail
        markdown={`# Could not load task\n\n${error}`}
        actions={
          <ErrorActions command="my-tasks" onRetry={() => void load()} />
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={detail?.title ?? "Task Details"}
      markdown={content}
      metadata={
        detail ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={detail.status} />
            <Detail.Metadata.Label
              title="Priority"
              text={detail.priority.replaceAll("_", " ")}
            />
            <Detail.Metadata.Label
              title="Due"
              text={formatDueDate(detail.dueDate) ?? "No due date"}
            />
            <Detail.Metadata.Label
              title="Estimate"
              text={minutes(detail.estimatedTime)}
            />
            <Detail.Metadata.Label
              title="Time Logged"
              text={minutes(detail.timeLogged)}
            />
            <Detail.Metadata.Label
              title="Assignees"
              text={
                detail.assigneeProfiles
                  .map((profile) => profile.name)
                  .join(", ") || "Unassigned"
              }
            />
            {detail.section ? (
              <Detail.Metadata.Label
                title="Section"
                text={`${detail.section.recordTitle} · ${detail.section.name ?? "Ungrouped"}`}
              />
            ) : null}
            <Detail.Metadata.Label
              title="Linked Records"
              text={
                detail.linkedRecords.map((record) => record.title).join(", ") ||
                "None"
              }
            />
            <Detail.Metadata.Label
              title="Linked Meetings"
              text={
                detail.linkedMeetings
                  .map((meeting) => meeting.title)
                  .join(", ") || "None"
              }
            />
            <Detail.Metadata.Label
              title="Files"
              text={String(detail.files.length)}
              icon={Icon.Paperclip}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Created"
              text={dateTime(detail.createdAt)}
            />
            <Detail.Metadata.Label
              title="Updated"
              text={dateTime(detail.updatedAt)}
            />
            <Detail.Metadata.Link
              title="Kato"
              target={detail.webUrl}
              text="Open Task"
            />
          </Detail.Metadata>
        ) : null
      }
      actions={
        detail ? (
          <TaskActions
            task={detail}
            statuses={statuses}
            showDetailsAction={false}
            onUpdated={(updated) =>
              setDetail((current) =>
                current ? { ...current, ...updated } : current,
              )
            }
          />
        ) : undefined
      }
    />
  );
}
