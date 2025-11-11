import { Issue as WorkItem, PatchedIssueRequest } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { updateWorkItem } from "../../api/work-items";
import UpdateStateSubmenu from "./UpdateStateSubmenu";
import UpdatePrioritySubmenu from "./UpdatePrioritySubmenu";
import EditWorkItemForm from "../EditWorkItemForm";

interface WorkItemActionsProps {
  workItem: WorkItem;
  mutateWorkItemDetail: () => void;
}

export interface UpdateWorkItem {
  updatePayload: Partial<PatchedIssueRequest>;
  updatingMessage: string;
  successMessage: string;
  errorMessage: string;
}

export default function WorkItemActions({ workItem, mutateWorkItemDetail }: WorkItemActionsProps) {
  const handleUpdateWorkItem = async ({
    updatePayload,
    updatingMessage,
    successMessage,
    errorMessage,
  }: UpdateWorkItem) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: updatingMessage,
    });
    try {
      if (!workItem.id || !workItem.project) {
        return null;
      }
      const response = await updateWorkItem({
        workItemId: workItem.id,
        projectId: workItem.project,
        patchWorkItemRequest: {
          ...updatePayload,
        },
      });
      if (response?.id) {
        toast.title = successMessage;
        toast.style = Toast.Style.Success;
        mutateWorkItemDetail();
      } else {
        toast.title = errorMessage;
        toast.style = Toast.Style.Failure;
      }
    } catch (error) {
      console.error("error", error);
      toast.title = errorMessage;
      toast.style = Toast.Style.Failure;
      toast.message = error instanceof Error ? error.message : "Something went wrong";
    }
  };

  return (
    <ActionPanel.Section>
      <Action.Push
        title="Edit Work Item"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        target={<EditWorkItemForm workItem={workItem} mutateWorkItemDetail={mutateWorkItemDetail} />}
      />
      <UpdateStateSubmenu workItem={workItem} handleUpdateWorkItem={handleUpdateWorkItem} />
      <UpdatePrioritySubmenu workItem={workItem} handleUpdateWorkItem={handleUpdateWorkItem} />
    </ActionPanel.Section>
  );
}
