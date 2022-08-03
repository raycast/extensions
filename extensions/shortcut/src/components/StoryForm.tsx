import { useMemo, useState } from "react";
import { Form, Icon } from "@raycast/api";
import { Story } from "@useshortcut/client";

import { getMemberAvatar, getMemberName, getStoryColor, StoryTypes } from "../helpers/storyHelpers";
import { capitalize } from "../utils/string";
import { useGroups, useIterations, useMemberInfo, useMembers, useProjects, useWorkflows } from "../hooks";

export default function StoryForm({ story }: { story?: Story }) {
  const { data: members, isLoading: isMembersLoading } = useMembers();
  const { data: memberInfo, isLoading: isMemberInfoLoading } = useMemberInfo();
  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const { data: workflows, isLoading: isWorkflowsLoading } = useWorkflows();
  const { data: teams, isLoading: isTeamsLoading } = useGroups();
  const { data: iterations, isLoading: isIterationsLoading } = useIterations();

  const isLoading =
    isMembersLoading ||
    isMemberInfoLoading ||
    isProjectsLoading ||
    isWorkflowsLoading ||
    isIterationsLoading ||
    isTeamsLoading;

  const [workflowId, setWorkflowId] = useState<number | undefined>(undefined);
  const workflowStates = useMemo(
    () => workflows?.find((w) => w.id === workflowId)?.states || [],
    [workflows, workflowId]
  );

  return (
    <Form enableDrafts isLoading={isLoading}>
      <Form.TextField title="Title" id="name" />

      <Form.TextArea enableMarkdown title="Description" id="description" />

      <Form.Dropdown id="estimate" title="Estimate">
        {memberInfo?.workspace2.estimate_scale?.map((estimate, index) => (
          <Form.Dropdown.Item title={estimate.toString()} value={estimate.toString()} key={`estimate_${index}`} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="project_id" title="Project">
        <Form.Dropdown.Item title="No project" value={""} key="no_project" />

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

      <Form.Dropdown id="group_id" title="Team">
        <Form.Dropdown.Item title="None" value={""} key="no_team" />

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

      <Form.Dropdown id="iteration_id" title="Iteration">
        <Form.Dropdown.Item title="None" value={""} key="no_iteration" />

        {iterations?.map((iteration) => (
          <Form.Dropdown.Item
            title={iteration.name}
            value={iteration.id.toString()}
            key={iteration.id}
            icon={Icon.Repeat}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="workflow_id"
        title="Workflow"
        onChange={(workflowId) => setWorkflowId(parseInt(workflowId, 10))}
      >
        <Form.Dropdown.Item title="None" value={""} key="no_workflow" icon={Icon.XMarkCircleFilled} />

        {workflows?.map((workflow) => (
          <Form.Dropdown.Item title={workflow.name} value={workflow.id.toString()} key={workflow.id} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="workflow_state_id" title="State">
        <Form.Dropdown.Item title="None" value={""} key="no_state" icon={Icon.XMarkCircleFilled} />

        {workflowStates?.map((state) => (
          <Form.Dropdown.Item title={state.name} value={state.id.toString()} key={state.id} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="type" title="Type">
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

      <Form.Dropdown id="owner_id" title="Owner">
        <Form.Dropdown.Item title="None" value={""} key="no_owner" icon={Icon.XMarkCircleFilled} />

        {members?.map((member) => (
          <Form.Dropdown.Item
            title={getMemberName(member)}
            value={member.id.toString()}
            key={member.id}
            icon={getMemberAvatar(member)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
