// sdk imports
import { IssueRequest, PriorityEnum } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
// file imports
import useMe from "../hooks/useMe";
import { useProjects } from "../hooks/useProjects";
import { useCycles } from "../hooks/useCycles";
import { useModules } from "../hooks/useModules";
import { useStates } from "../hooks/useStates";
import { useLabels } from "../hooks/useLabels";
import { useWorkspace } from "../hooks/useWorkspaces";
import { FormValidation, useForm } from "@raycast/utils";
import { getStateIcon, priorityToIcon } from "../helpers/icons";
import { createWorkItem } from "../api/work-items";
import { addWorkItemsToModule } from "../api/modules";
import { addWorkItemsToCycle } from "../api/cycles";
import WorkItemDetail from "./WorkItemDetail";
import { parseMarkdownToHtml } from "../helpers/parser";
import { useProjectMembers } from "../hooks/useMembers";

export type CreateWorkItemFormProps = {
  draftValues?: CreateWorkItemFormValues;
  enableDrafts?: boolean;
};

export interface CreateWorkItemFormValues extends IssueRequest {
  projectId: string;
  cycleId: string;
  moduleId: string;
  stateId: string;
  priorityName: string;
  assigneeIds: string[];
}

export default function CreateWorkItemForm(props: CreateWorkItemFormProps) {
  const { isLoading: isMeLoading } = useMe();
  const { workspaceSlug } = useWorkspace();
  const { push } = useNavigation();

  const { handleSubmit, itemProps, values, setValue, reset } = useForm<CreateWorkItemFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Work Item",
      });
      try {
        const htmlDescription = await parseMarkdownToHtml(values.descriptionHtml || "");
        // create the issue
        const workItem = await createWorkItem(values.projectId, {
          name: values.name,
          ...(values.descriptionHtml ? { descriptionHtml: htmlDescription } : {}),
          labels: values.labels,
          state: values.stateId,
          priority: values.priorityName as PriorityEnum,
          assignees: values.assigneeIds,
        });

        if (values?.moduleId && workItem?.id) {
          // add the issue to the module
          await addWorkItemsToModule({
            projectId: values.projectId,
            moduleId: values.moduleId,
            workItemIds: [workItem.id],
          });
        }

        if (values?.cycleId && workItem?.id) {
          // add the issue to the cycle
          await addWorkItemsToCycle({
            projectId: values.projectId,
            cycleId: values.cycleId,
            workItemIds: [workItem.id],
          });
        }

        reset({
          projectId: "",
          cycleId: "",
          moduleId: "",
          stateId: "",
          priorityName: PriorityEnum.None.toString(),
        });

        toast.title = "Work item created";
        toast.style = Toast.Style.Success;
        toast.primaryAction = {
          title: "Open Work Item",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: async () => {
            if (workItem?.id && workspaceSlug) {
              push(
                <WorkItemDetail
                  slug={workspaceSlug}
                  projectId={values.projectId}
                  workItemId={workItem.id}
                  mutateWorkItemList={() => {}}
                />,
              );
            }
            await toast.hide();
          },
        };
      } catch (error) {
        console.error("error", error);
        toast.title = "Error creating Work Item";
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Something went wrong";
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      projectId: props.draftValues?.projectId,
      cycleId: props.draftValues?.cycleId,
      moduleId: props.draftValues?.moduleId,
      stateId: props.draftValues?.stateId,
      priorityName: props.draftValues?.priorityName,
      assigneeIds: props.draftValues?.assigneeIds,
    },
  });

  const isSlugSelected = !!workspaceSlug;
  const isSlugAndProjectSelected = !!workspaceSlug && !!values.projectId;
  const { projects, isLoading: isProjectsLoading } = useProjects({ execute: isSlugSelected });
  const { states, isLoading: isStatesLoading } = useStates(values.projectId, {
    execute: isSlugAndProjectSelected,
  });
  const { cycles, isLoading: isCyclesLoading } = useCycles(values.projectId, {
    execute: isSlugAndProjectSelected,
  });
  const { modules, isLoading: isModulesLoading } = useModules(values.projectId, {
    execute: isSlugAndProjectSelected,
  });
  const { labels } = useLabels(values.projectId, {
    execute: isSlugAndProjectSelected,
  });
  const { members } = useProjectMembers(values.projectId, {
    execute: isSlugAndProjectSelected,
  });

  return (
    <Form
      enableDrafts={props.enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Work Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isMeLoading}
    >
      <Form.Dropdown
        title="Project"
        {...itemProps.projectId}
        isLoading={isProjectsLoading}
        placeholder="Select Project"
      >
        {projects?.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id || ""} title={project.name} />
        ))}
      </Form.Dropdown>

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

      <Form.TagPicker
        title="Label"
        {...itemProps.labels}
        onChange={(value) => {
          setValue("labels", value || []);
        }}
        placeholder="Select Labels"
      >
        {labels?.map((label) => (
          <Form.TagPicker.Item key={label.id} value={label.id || ""} title={label.name || ""} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown title="Cycle" {...itemProps.cycleId} isLoading={isCyclesLoading} placeholder="Select Cycle">
        <Form.Dropdown.Item key={"none"} value={""} title={"No Cycle"} />
        {cycles?.map((cycle) => (
          <Form.Dropdown.Item key={cycle.id} value={cycle.id || ""} title={cycle.name || ""} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Module" {...itemProps.moduleId} isLoading={isModulesLoading} placeholder="Select Module">
        <Form.Dropdown.Item key={"none"} value={""} title={"No Module"} />
        {modules?.map((module) => (
          <Form.Dropdown.Item key={module.id} value={module.id || ""} title={module.name || ""} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        title="Assignees"
        {...itemProps.assigneeIds}
        onChange={(value) => {
          setValue("assigneeIds", value || []);
        }}
        placeholder="Select Assignees"
      >
        {members?.map((member) => (
          <Form.TagPicker.Item key={member.id} value={member.id || ""} title={member.displayName || ""} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
