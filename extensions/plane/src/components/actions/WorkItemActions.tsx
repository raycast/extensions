import { Issue, PatchedIssueRequest, PriorityEnum, State } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { ReactNode } from "react";
import { getWorkItem, updateWorkItem } from "../../api/work-items";
import { getMe } from "../../api/users";
import { WorkItemChange, WorkItemSummary } from "../../api/types";
import UpdateStateSubmenu from "./UpdateStateSubmenu";
import UpdatePrioritySubmenu from "./UpdatePrioritySubmenu";
import ChangeWorkspaceAction from "./ChangeWorkspaceAction";
import EditWorkItemForm from "../EditWorkItemForm";
import AddCommentForm from "../AddCommentForm";
import WorkItemDetail from "../WorkItemDetail";
import { getWorkItemUrlWithIdentifier } from "../../helpers/work-items";
import { formatWorkItemIdentifier } from "../../helpers/identifiers";
import { capitalizeString } from "../../helpers/strings";
import { describePlaneError } from "../../helpers/errors";
import { applyWorkItemChange } from "../../helpers/work-item-summary";

/** Applies a change optimistically to whatever data the list holds, then awaits `request`. */
export type WorkItemMutator = (
  workItemId: string,
  request: Promise<unknown>,
  change: WorkItemChange,
) => Promise<unknown>;

type ArrayMutate = (
  asyncUpdate?: Promise<unknown>,
  options?: { optimisticUpdate?: (data: WorkItemSummary[] | undefined) => WorkItemSummary[] },
) => Promise<unknown>;

/** Builds a `WorkItemMutator` for hooks whose data is a `WorkItemSummary[]`. */
export function arrayMutator(mutate: ArrayMutate): WorkItemMutator {
  return (workItemId, request, change) =>
    mutate(request, {
      optimisticUpdate: (data) =>
        (data ?? []).map((item) => (item.id === workItemId ? applyWorkItemChange(item, change) : item)),
    });
}

export interface UpdateWorkItem {
  updatePayload: Partial<PatchedIssueRequest>;
  updatingMessage: string;
  successMessage: string;
  errorMessage: string;
}

type WorkItemActionsProps = {
  workItem: WorkItemSummary;
  /** Optimistic list update. Without it, the request is awaited and `onChanged` refreshes. */
  mutate?: WorkItemMutator;
  /** Called after a successful update or comment. */
  onChanged?: () => void;
  /** Passed to the pushed detail view so it can refresh the list. */
  mutateWorkItemList?: () => void;
  /** Current user id, to label "Assign to Me" vs "Unassign Me". */
  currentUserId?: string;
  /** Hide "Open Work Item" when already on the detail view. */
  showDetailAction?: boolean;
  /** Command-specific actions, shown after the update section. */
  extraActions?: ReactNode;
};

/** The action panel used by every work item row and the detail view. */
export default function WorkItemActions({
  workItem,
  mutate,
  onChanged,
  mutateWorkItemList,
  currentUserId,
  showDetailAction = true,
  extraActions,
}: WorkItemActionsProps) {
  const identifier = formatWorkItemIdentifier(workItem.projectIdentifier, workItem.sequenceId);
  const url = getWorkItemUrlWithIdentifier(workItem.workspaceSlug, identifier);
  const isAssignedToMe = !!currentUserId && !!workItem.assigneeIds?.includes(currentUserId);

  async function runUpdate(
    patch: PatchedIssueRequest,
    change: WorkItemChange,
    update: Omit<UpdateWorkItem, "updatePayload">,
  ) {
    const toast = await showToast({ style: Toast.Style.Animated, title: update.updatingMessage });
    try {
      const request = updateWorkItem({
        workItemId: workItem.id,
        projectId: workItem.projectId,
        patchWorkItemRequest: patch,
      });
      if (mutate) {
        await mutate(workItem.id, request, change);
      } else {
        await request;
      }
      toast.style = Toast.Style.Success;
      toast.title = update.successMessage;
      onChanged?.();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = update.errorMessage;
      toast.message = describePlaneError(error).message;
    }
  }

  function handleStateChange(state: State) {
    return runUpdate(
      { state: state.id },
      {
        stateId: state.id,
        state: { id: state.id ?? "", name: state.name, color: state.color, group: state.group },
      },
      {
        updatingMessage: "Updating State",
        successMessage: `${identifier} moved to ${state.name}`,
        errorMessage: `Error updating state to ${state.name}`,
      },
    );
  }

  function handlePriorityChange(priority: PriorityEnum) {
    return runUpdate(
      { priority },
      { priority },
      {
        updatingMessage: "Updating Priority",
        successMessage: `Priority updated to ${capitalizeString(priority.toString())}`,
        errorMessage: `Error updating priority to ${capitalizeString(priority.toString())}`,
      },
    );
  }

  async function handleAssignToMe() {
    try {
      const me = await getMe();
      if (!me.id) throw new Error("Could not load the current user");
      // Search results don't include assignees; fetch them so the PATCH (which replaces the set) keeps others.
      const current = workItem.assigneeIds ?? (await getWorkItem(workItem.id, workItem.projectId)).assignees;
      const unassign = current.includes(me.id) && isAssignedToMe;
      if (current.includes(me.id) && !unassign) {
        await showToast({ style: Toast.Style.Success, title: `${identifier} is already assigned to you` });
        return;
      }
      const next = unassign ? current.filter((id) => id !== me.id) : [...current, me.id];
      await runUpdate(
        { assignees: next },
        { assigneeIds: next },
        {
          updatingMessage: unassign ? "Unassigning" : "Assigning to You",
          successMessage: unassign ? `Unassigned from ${identifier}` : `${identifier} assigned to you`,
          errorMessage: unassign ? "Error unassigning" : "Error assigning",
        },
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error updating assignees",
        message: describePlaneError(error).message,
      });
    }
  }

  const issueForEdit: Issue = { id: workItem.id, name: workItem.name, project: workItem.projectId };

  return (
    <ActionPanel title={identifier}>
      <ActionPanel.Section>
        {showDetailAction ? (
          <Action.Push
            icon={Icon.Sidebar}
            title="Open Work Item"
            target={
              <WorkItemDetail
                slug={workItem.workspaceSlug}
                projectId={workItem.projectId}
                workItemId={workItem.id}
                mutateWorkItemList={mutateWorkItemList ?? onChanged ?? (() => {})}
              />
            }
          />
        ) : null}
        <Action.OpenInBrowser url={url} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Push
          title="Edit Work Item"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          target={<EditWorkItemForm workItem={issueForEdit} mutateWorkItemDetail={onChanged ?? (() => {})} />}
        />
        <UpdateStateSubmenu
          projectId={workItem.projectId}
          currentStateId={workItem.stateId}
          onSelect={handleStateChange}
        />
        <UpdatePrioritySubmenu currentPriority={workItem.priority} onSelect={handlePriorityChange} />
        <Action
          title={isAssignedToMe ? "Unassign Me" : "Assign to Me"}
          icon={isAssignedToMe ? Icon.RemovePerson : Icon.AddPerson}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={handleAssignToMe}
        />
        <Action.Push
          title="Add Comment"
          icon={Icon.Bubble}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          target={
            <AddCommentForm
              projectId={workItem.projectId}
              workItemId={workItem.id}
              identifier={identifier}
              onCommentAdded={onChanged}
            />
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Identifier"
          content={identifier}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        />
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={`[${identifier}: ${workItem.name}](${url})`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      </ActionPanel.Section>

      {extraActions ? <ActionPanel.Section>{extraActions}</ActionPanel.Section> : null}

      <ActionPanel.Section>
        <ChangeWorkspaceAction />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
