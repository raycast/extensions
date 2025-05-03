import { useMemo, useState, useEffect } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { CreateStoryParams, Story, StorySlim, UpdateStory } from "@useshortcut/client";

import { getMemberAvatar, getMemberName, getStoryColor, StoryTypes, useFormField } from "../helpers/storyHelpers";
import { capitalize } from "../utils/string";
import { useGroups, useIterations, useMemberInfo, useMembers, useProjects, useEpics, useWorkflows } from "../hooks";
import { sortIterationByStartDateDesc } from "../helpers/iterationHelper";

export type StoryFormRawValues = {
  name?: string;
  description?: string;
  story_type?: string;
  iteration_id?: string;
  group_id?: string;
  workflow_id?: string;
  workflow_state_id?: string;
  owner_ids?: string[];
  project_id?: string;
  epic_id?: string;
  estimate?: string;
};

function processStoryFormValues(values: StoryFormRawValues) {
  const processed = Object.entries(values).reduce((acc, [key, value]) => {
    if (value === "") {
      return {
        ...acc,
        [key]: null,
      };
    } else {
      if (
        key === "iteration_id" ||
        key === "project_id" ||
        key === "epic_id" ||
        key === "workflow_state_id" ||
        key === "estimate"
      ) {
        return {
          ...acc,
          [key]: parseInt(value as string, 10),
        };
      } else if (key === "workflow_id") {
        // omit workflow_id from the form values
        return acc;
      } else {
        return {
          ...acc,
          [key]: value,
        };
      }
    }
  }, {} as CreateStoryParams | UpdateStory);

  return processed;
}

export default function StoryForm({
  story,
  submitTitle,
  onSubmit,
  draftValues,
  enableDrafts,
}: {
  story?: Story | StorySlim;
  submitTitle?: string;
  onSubmit: (story: CreateStoryParams | UpdateStory) => void;
  draftValues?: StoryFormRawValues;
  enableDrafts?: boolean;
}) {
  const { data: members, isLoading: isMembersLoading } = useMembers();
  const { data: memberInfo, isLoading: isMemberInfoLoading } = useMemberInfo();
  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const { data: epics, isLoading: isEpicsLoading } = useEpics();
  const { data: workflows, isLoading: isWorkflowsLoading } = useWorkflows();
  const { data: teams, isLoading: isTeamsLoading } = useGroups();
  const { data: iterations, isLoading: isIterationsLoading } = useIterations();

  const isLoading =
    isMembersLoading ||
    isMemberInfoLoading ||
    isProjectsLoading ||
    isEpicsLoading ||
    isWorkflowsLoading ||
    isIterationsLoading ||
    isTeamsLoading;

  const storyNameFields = useFormField(story?.name ?? (draftValues?.name || ""), {
    validator: (value) => value.length > 0 && value.length <= 512,
    errorMessage: "Name is required, and must be less than 512 characters",
  });

  const descriptionFields = useFormField(story?.description ?? (draftValues?.description || ""), {
    validator: (value) => !value || value.length <= 100000,
    errorMessage: "Description must be less than 100000 characters",
  });

  const storyTypeFields = useFormField(story?.story_type ?? (draftValues?.story_type || ""));
  const groupFields = useFormField(story?.group_id ?? (draftValues?.group_id || ""));
  const ownerFields = useFormField(story?.owner_ids ?? (draftValues?.owner_ids || []));

  const defaultIterationId = story?.iteration_id && String(story?.iteration_id);
  const iterationFields = useFormField(defaultIterationId || draftValues?.iteration_id || "");

  const defaultProjectId = story?.project_id && String(story?.project_id);
  const projectFields = useFormField(defaultProjectId || draftValues?.project_id || "");

  const defaultEpicId = story?.epic_id && String(story?.epic_id);
  const epicFields = useFormField(defaultEpicId || draftValues?.epic_id || "");

  const defaultEstimate = story?.estimate && String(story.estimate);
  const estimateFields = useFormField(defaultEstimate || draftValues?.estimate || "");

  const defaultWorkflowId = story?.workflow_id && String(story.workflow_id);
  const workflowFields = useFormField(defaultWorkflowId || draftValues?.workflow_id || "");

  const defaultWorkflowStateId = story?.workflow_state_id && String(story.workflow_state_id);
  const workflowStateFields = useFormField(defaultWorkflowStateId || draftValues?.workflow_state_id || "", {
    // also valid when no workflow is selected
    validator: (value) => !!value,
    errorMessage: "Workflow state is required",
  });

  const workflowStates = useMemo(
    () => workflows?.find((w) => w.id === parseInt(workflowFields.value, 10))?.states || [],
    [workflows, workflowFields.value]
  );

  const requiredFields = [storyNameFields, workflowFields, workflowStateFields];

  // Load the workflow states when the workflow changes
  useEffect(() => {
    if (!workflowFields.value && workflows && workflows?.length > 0) {
      const workflow = workflows[0];
      workflowFields.onChange(String(workflow.id));
      workflowStateFields.onChange(String(workflow.default_state_id));
    }
  }, [workflows]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Form
      enableDrafts={enableDrafts}
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle || "Create Story"}
            icon={Icon.ArrowUpCircleFilled}
            onSubmit={async (values: StoryFormRawValues) => {
              if (requiredFields.some((field) => !field.validate())) {
                return;
              }

              setIsSubmitting(true);

              try {
                await Promise.resolve(onSubmit(processStoryFormValues(values)));
              } catch (e) {
                showToast({
                  title: "Error",
                  message: String(e),
                  style: Toast.Style.Failure,
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" id="name" {...storyNameFields} />
      <Form.TextArea enableMarkdown title="Description" id="description" {...descriptionFields} />
      <Form.Dropdown id="estimate" title="Estimate" {...estimateFields}>
        <Form.Dropdown.Item title="None" value={""} key="no_estimate" icon={Icon.XMarkCircleFilled} />

        {memberInfo?.workspace2.estimate_scale?.map((estimate, index) => (
          <Form.Dropdown.Item title={estimate.toString()} value={estimate.toString()} key={`estimate_${index}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="project_id" title="Project" {...projectFields}>
        <Form.Dropdown.Item title="None" value={""} key="no_project" icon={Icon.XMarkCircleFilled} />

        {projects?.map((project) => (
          <Form.Dropdown.Item
            title={project.name}
            value={project.id.toString()}
            key={project.id}
            icon={{
              source: Icon.CircleFilled,
              tintColor: project.color,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="epic_id" title="Epic" {...epicFields}>
        <Form.Dropdown.Item title="None" value={""} key="no_epic" icon={Icon.XMarkCircleFilled} />

        {epics?.map((epic) => (
          <Form.Dropdown.Item
            title={epic.name}
            value={epic.id.toString()}
            key={epic.id}
            icon={{
              source: Icon.CircleFilled,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="group_id" title="Team" {...groupFields}>
        <Form.Dropdown.Item title="None" value={""} key="no_team" icon={Icon.XMarkCircleFilled} />

        {teams?.map((team) => (
          <Form.Dropdown.Item
            title={team.name}
            value={team.id.toString()}
            key={team.id}
            icon={{
              source: Icon.TwoPeople,
              tintColor: team.color,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="iteration_id" title="Iteration" {...iterationFields}>
        <Form.Dropdown.Item title="None" value={""} key="no_iteration" icon={Icon.XMarkCircleFilled} />

        {iterations?.sort(sortIterationByStartDateDesc).map((iteration) => (
          <Form.Dropdown.Item
            title={iteration.name}
            value={iteration.id.toString()}
            key={iteration.id}
            icon={Icon.Repeat}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="workflow_id" title="Workflow" {...workflowFields}>
        {workflows?.map((workflow) => (
          <Form.Dropdown.Item title={workflow.name} value={workflow.id.toString()} key={workflow.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="workflow_state_id" title="State" {...workflowStateFields}>
        {workflowStates?.map((state) => (
          <Form.Dropdown.Item title={state.name} value={state.id.toString()} key={state.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="story_type" title="Type" {...storyTypeFields}>
        {StoryTypes.map((storyType) => (
          <Form.Dropdown.Item
            title={capitalize(storyType)}
            value={storyType}
            key={storyType}
            icon={{
              source: Icon.Dot,
              tintColor: getStoryColor(storyType),
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="owner_ids" title="Owner" {...ownerFields}>
        {members?.map((member) => (
          <Form.TagPicker.Item
            title={getMemberName(member)}
            value={member.id}
            key={member.id}
            icon={getMemberAvatar(member)}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
