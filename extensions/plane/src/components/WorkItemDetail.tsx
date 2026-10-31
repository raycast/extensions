import { Action, Color, Detail, Icon, Image } from "@raycast/api";
import { fromPlaneDate } from "../helpers/dates";
import { PriorityEnum } from "@makeplane/plane-node-sdk";
import { getAvatarIcon } from "@raycast/utils";
import { format } from "date-fns";
import { useProject } from "../hooks/useProjects";
import { getStateIcon, priorityToIcon } from "../helpers/icons";
import { useStates } from "../hooks/useStates";
import { parseHtmlToMarkdown } from "../helpers/parser";
import { useWorkItemComments, useWorkItemCycleAndModules, useWorkItemDetail } from "../hooks/useWorkItemDetail";
import WorkItemActions, { OPTIMISTIC_ONLY, WorkItemMutator } from "./actions/WorkItemActions";
import { ErrorActions, getErrorMarkdown } from "./ErrorEmptyView";
import { capitalizeString } from "../helpers/strings";
import { RawComment, RawUserLite, WorkItemSummary } from "../api/types";
import useMe from "../hooks/useMe";
import { getCycleUrl, getModuleUrl } from "../helpers/work-items";
import { getApiBasePath } from "../helpers/urls";

export type WorkItemDetailProps = {
  slug: string;
  projectId: string;
  workItemId: string;
  mutateWorkItemList: () => void;
};

function formatDate(value: Date | string | null | undefined, pattern = "dd MMM yyyy") {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : format(date, pattern);
}

function userName(user: RawUserLite | string | null | undefined) {
  if (!user || typeof user === "string") return "Someone";
  return user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Someone";
}

function userIcon(user: RawUserLite): Image.ImageLike {
  if (!user.avatar_url) return getAvatarIcon(userName(user));
  // Avatar URLs can be relative (`/api/assets/...`) and are served by the API host.
  const source = user.avatar_url.startsWith("/") ? `${getApiBasePath()}${user.avatar_url}` : user.avatar_url;
  return { source: encodeURI(source), mask: Image.Mask.Circle };
}

function renderComments(comments: RawComment[], total: number) {
  if (comments.length === 0) return "";
  // The API returns newest first; read them in conversation order.
  const ordered = [...comments].reverse();
  const heading =
    total > comments.length ? `## Comments (latest ${comments.length} of ${total})` : `## Comments (${total})`;
  const body = ordered
    .map((comment) => {
      const when = formatDate(comment.created_at, "dd MMM yyyy, HH:mm") ?? "";
      const text = parseHtmlToMarkdown(comment.comment_html ?? "").trim() || "_(empty)_";
      return `**${userName(comment.actor)}** · ${when}\n\n${text}`;
    })
    .join("\n\n---\n\n");
  return `\n\n---\n\n${heading}\n\n${body}`;
}

export default function WorkItemDetail({ slug, projectId, workItemId, mutateWorkItemList }: WorkItemDetailProps) {
  const { project, isLoading: isLoadingProject } = useProject(projectId);
  const { states, isLoading: isLoadingStates } = useStates(projectId, { execute: !!projectId });
  const {
    data: workItem,
    isLoading: isLoadingWorkItem,
    mutate,
    revalidate,
    error,
  } = useWorkItemDetail(workItemId, projectId, { showsErrorInline: true });
  const {
    data: commentData,
    isLoading: isLoadingComments,
    revalidate: revalidateComments,
  } = useWorkItemComments(workItemId, projectId);
  const { data: cycleAndModules, revalidate: revalidateCycleAndModules } = useWorkItemCycleAndModules(
    workItemId,
    projectId,
  );
  const { me } = useMe();

  const state = states?.find((state) => state.id === workItem?.state);

  const refreshAll = () => {
    revalidate();
    revalidateComments();
    revalidateCycleAndModules();
    mutateWorkItemList();
  };

  if (error && !workItem) {
    return (
      <Detail
        markdown={getErrorMarkdown(error)}
        isLoading={isLoadingWorkItem}
        actions={<ErrorActions onRetry={revalidate} />}
      />
    );
  }

  let markdown = "";
  if (workItem) {
    markdown = `# ${workItem.name}`;
    if (workItem.descriptionHtml) {
      markdown += `\n\n${parseHtmlToMarkdown(workItem.descriptionHtml)}`;
    }
    markdown += renderComments(commentData?.comments ?? [], commentData?.total ?? 0);
  }

  const summary: WorkItemSummary | undefined =
    workItem && project && workItem.id
      ? {
          id: workItem.id,
          name: workItem.name,
          projectId,
          projectIdentifier: project.identifier,
          projectName: project.name,
          sequenceId: workItem.sequenceId ?? "?",
          workspaceSlug: slug,
          stateId: workItem.state,
          state: state ? { id: state.id ?? "", name: state.name, color: state.color, group: state.group } : undefined,
          priority: workItem.priority,
          assigneeIds: workItem.assignees,
          labelIds: workItem.labels,
        }
      : undefined;

  const detailMutator: WorkItemMutator = (_id, request, change) =>
    mutate(request, {
      ...OPTIMISTIC_ONLY,
      optimisticUpdate: (data) =>
        data && {
          ...data,
          ...(change.stateId !== undefined ? { state: change.stateId } : {}),
          ...(change.priority !== undefined ? { priority: change.priority } : {}),
          ...(change.assigneeIds !== undefined ? { assignees: change.assigneeIds } : {}),
        },
    });

  const cycle = cycleAndModules?.cycle;
  const modules = cycleAndModules?.modules ?? [];

  return (
    <Detail
      navigationTitle={summary ? `${summary.projectIdentifier}-${summary.sequenceId}` : "Work Item"}
      markdown={markdown}
      isLoading={isLoadingProject || isLoadingStates || isLoadingWorkItem || isLoadingComments}
      metadata={
        project && workItem ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Identifier"
              text={`${project.identifier}-${workItem.sequenceId}`}
              icon={Icon.BullsEye}
            />
            <Detail.Metadata.Label title="Project" text={project.name} icon={Icon.Folder} />
            <Detail.Metadata.Separator />
            {state && <Detail.Metadata.Label title="State" text={state.name} icon={getStateIcon(state)} />}
            <Detail.Metadata.Label
              title="Priority"
              text={capitalizeString(workItem.priority?.toString()) || "None"}
              icon={priorityToIcon((workItem.priority ?? PriorityEnum.None) as PriorityEnum)}
            />
            {workItem.assigneeDetails.length > 0 ? (
              <Detail.Metadata.TagList title="Assignees">
                {workItem.assigneeDetails.map((user) => (
                  <Detail.Metadata.TagList.Item key={user.id} text={userName(user)} icon={userIcon(user)} />
                ))}
              </Detail.Metadata.TagList>
            ) : (
              <Detail.Metadata.Label title="Assignees" text="Unassigned" icon={Icon.Person} />
            )}
            {workItem.labelDetails.length > 0 ? (
              <Detail.Metadata.TagList title="Labels">
                {workItem.labelDetails.map((label) => (
                  <Detail.Metadata.TagList.Item
                    key={label.id}
                    text={label.name}
                    color={label.color || Color.SecondaryText}
                  />
                ))}
              </Detail.Metadata.TagList>
            ) : null}
            {cycle ? (
              <Detail.Metadata.Link title="Cycle" text={cycle.name} target={getCycleUrl(slug, projectId, cycle.id)} />
            ) : null}
            {modules.map((module, index) => (
              <Detail.Metadata.Link
                key={module.id}
                title={index === 0 ? (modules.length > 1 ? "Modules" : "Module") : ""}
                text={module.name}
                target={getModuleUrl(slug, projectId, module.id)}
              />
            ))}
            <Detail.Metadata.Separator />
            {formatDate(fromPlaneDate(workItem.startDate)) ? (
              <Detail.Metadata.Label
                title="Start Date"
                text={formatDate(fromPlaneDate(workItem.startDate))}
                icon={Icon.Calendar}
              />
            ) : null}
            {formatDate(fromPlaneDate(workItem.targetDate)) ? (
              <Detail.Metadata.Label
                title="Due Date"
                text={formatDate(fromPlaneDate(workItem.targetDate))}
                icon={Icon.Calendar}
              />
            ) : null}
            {formatDate(workItem.createdAt) ? (
              <Detail.Metadata.Label
                title="Created"
                text={formatDate(workItem.createdAt, "dd MMM yyyy, HH:mm")}
                icon={Icon.Clock}
              />
            ) : null}
            {formatDate(workItem.updatedAt) ? (
              <Detail.Metadata.Label
                title="Updated"
                text={formatDate(workItem.updatedAt, "dd MMM yyyy, HH:mm")}
                icon={Icon.Clock}
              />
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        summary ? (
          <WorkItemActions
            workItem={summary}
            mutate={detailMutator}
            onChanged={refreshAll}
            currentUserId={me?.id}
            showDetailAction={false}
            extraActions={
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refreshAll}
              />
            }
          />
        ) : undefined
      }
    />
  );
}
