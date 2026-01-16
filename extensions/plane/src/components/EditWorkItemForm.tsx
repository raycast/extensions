// sdk imports
import { Issue, PatchedIssueRequest, PriorityEnum } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
// file imports
import useMe from "../hooks/useMe";
import { useStates } from "../hooks/useStates";
import { useWorkspace } from "../hooks/useWorkspaces";
import { FormValidation, useForm } from "@raycast/utils";
import { getStateIcon, priorityToIcon } from "../helpers/icons";
import { updateWorkItem } from "../api/work-items";
import { parseHtmlToMarkdown, parseMarkdownToHtml } from "../helpers/parser";
import { useWorkItemDetail } from "../hooks/useWorkItemDetail";
import { useProject } from "../hooks/useProjects";
import { getWorkItemIdentifier } from "../helpers/work-items";

export type EditWorkItemFormProps = {
  workItem: Issue;
  mutateWorkItemDetail: () => void;
};

export interface EditWorkItemFormValues extends PatchedIssueRequest {
  stateId: string;
  priorityName: string;
}

export default function EditWorkItemForm(props: EditWorkItemFormProps) {
  const { isLoading: isMeLoading } = useMe();
  const { workspaceSlug } = useWorkspace();
  const { project: projectId, id: workItemId } = props.workItem;

  if (!workItemId || !projectId) {
    return <List.EmptyView title="Work Item not found" />;
  }
  const { data: workItem, isLoading: isWorkItemLoading } = useWorkItemDetail(workItemId, projectId);
  const { project, isLoading: isProjectLoading } = useProject(projectId);
  const { pop } = useNavigation();

  if (!workItem && !isWorkItemLoading) {
    return <List.EmptyView title="Work Item not found" />;
  }

  const { handleSubmit, itemProps, values, setValue } = useForm<EditWorkItemFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating Work Item",
      });
      try {
        const htmlDescription = await parseMarkdownToHtml(values.descriptionHtml || "");
        // create the issue
        const updatedWorkItem = await updateWorkItem({
          workItemId: workItemId,
          projectId: projectId,
          patchWorkItemRequest: {
            name: values.name,
            ...(values.descriptionHtml ? { descriptionHtml: htmlDescription } : {}),
            state: values.stateId,
            priority: values.priorityName as PriorityEnum,
          },
        });

        if (updatedWorkItem && project) {
          toast.title = `Work item updated ${getWorkItemIdentifier(project, updatedWorkItem)}`;
          toast.style = Toast.Style.Success;
          props.mutateWorkItemDetail();
          pop();
        } else {
          toast.title = "Error updating Work Item";
          toast.style = Toast.Style.Failure;
          toast.message = "Something went wrong";
        }
      } catch (error) {
        console.error("error", error);
        toast.title = "Error updating Work Item";
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Something went wrong";
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: workItem?.name || undefined,
      descriptionHtml: parseHtmlToMarkdown(workItem?.descriptionHtml || ""),
      stateId: workItem?.state || undefined,
      priorityName: workItem?.priority?.toString() || undefined,
    },
  });

  const isSlugAndProjectSelected = !!workspaceSlug && !!projectId;
  const { states, isLoading: isStatesLoading } = useStates(projectId, {
    execute: isSlugAndProjectSelected,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Work Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isMeLoading || isWorkItemLoading || isProjectLoading}
    >
      <Form.TextField title="Title" {...itemProps.name} placeholder="Enter a title for the work item" />

      <Form.TextArea
        title="Description"
        {...itemProps.descriptionHtml}
        placeholder="Enter a description for the work item (supports markdown)"
      />

      <Form.Dropdown title="State" {...itemProps.stateId} isLoading={isStatesLoading} placeholder="Select State">
        {states?.map((state) => (
          <Form.Dropdown.Item
            key={state.id}
            value={state.id || ""}
            title={state.name || ""}
            icon={getStateIcon(state)}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Priority"
        {...itemProps.priorityName}
        value={values.priorityName || "none"}
        onChange={(value) => {
          setValue("priorityName", value);
        }}
        placeholder="Select Priority"
      >
        <Form.Dropdown.Item key={"none"} value={"none"} title={"None"} icon={priorityToIcon(PriorityEnum.None)} />
        <Form.Dropdown.Item key={"low"} value={"low"} title={"Low"} icon={priorityToIcon(PriorityEnum.Low)} />
        <Form.Dropdown.Item
          key={"medium"}
          value={"medium"}
          title={"Medium"}
          icon={priorityToIcon(PriorityEnum.Medium)}
        />
        <Form.Dropdown.Item key={"high"} value={"high"} title={"High"} icon={priorityToIcon(PriorityEnum.High)} />
        <Form.Dropdown.Item
          key={"urgent"}
          value={"urgent"}
          title={"Urgent"}
          icon={priorityToIcon(PriorityEnum.Urgent)}
        />
      </Form.Dropdown>
    </Form>
  );
}
