import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";

import { ProjectResult } from "../api/getProjects";

import useTeams from "../hooks/useTeams";
import useUsers from "../hooks/useUsers";

import { getLinearClient } from "../api/linearClient";
import { getTeamIcon } from "../helpers/teams";
import { getUserIcon } from "../helpers/users";
import { projectStatuses, projectStatusIcon, projectStatusText } from "../helpers/projects";
import { getErrorMessage } from "../helpers/errors";
import { CreateProjectValues } from "./CreateProjectForm";

type EditProjectProps = {
  project: ProjectResult;
  mutateProjects: MutatePromise<ProjectResult[] | undefined>;
};

export default function EditProjectForm({ project, mutateProjects }: EditProjectProps) {
  const { linearClient } = getLinearClient();

  const { pop } = useNavigation();

  const { teams, isLoadingTeams } = useTeams();
  const { users, isLoadingUsers } = useUsers();

  const { handleSubmit, itemProps } = useForm<CreateProjectValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Editing project" });

      try {
        const { success } = await linearClient.updateProject(project.id, {
          teamIds: values.teamIds,
          name: values.name,
          description: values.description,
          state: values.state,
          memberIds: values.memberIds,
          ...(values.leadId ? { leadId: values.leadId } : {}),
          ...(values.startDate ? { startDate: values.startDate } : {}),
          ...(values.targetDate ? { targetDate: values.targetDate } : {}),
        });

        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = `Edited Project`;

          pop();

          mutateProjects();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to edit project";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      teamIds: FormValidation.Required,
      name: FormValidation.Required,
    },
    initialValues: {
      teamIds: project.teams.nodes.map((p) => p.id) || [],
      name: project.name,
      description: project.description,
      state: project.state,
      leadId: project.lead?.id,
      memberIds: project.members.nodes.map((p) => p.id) || [],
      startDate: project.startDate ? new Date(project.startDate) : null,
      targetDate: project.targetDate ? new Date(project.targetDate) : null,
    },
  });

  return (
    <Form
      isLoading={isLoadingTeams || isLoadingUsers}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker title="Team(s)" placeholder="Add team" {...itemProps.teamIds}>
        {teams?.map((team) => (
          <Form.TagPicker.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team)} />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.TextField title="Name" placeholder="Project name" {...itemProps.name} />

      <Form.TextArea
        title="Description"
        placeholder="Add some details (supports Markdown, e.g. **bold**)"
        {...itemProps.description}
      />

      <Form.Separator />

      <Form.Dropdown title="Status" {...itemProps.state}>
        {projectStatuses.map((status) => (
          <Form.Dropdown.Item
            key={status}
            value={status}
            title={projectStatusText[status]}
            icon={{ source: projectStatusIcon[status] }}
          />
        ))}
      </Form.Dropdown>

      {users && users.length > 0 ? (
        <Form.Dropdown title="Lead" {...itemProps.leadId}>
          <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

          {users?.map((user) => {
            return <Form.Dropdown.Item title={user.name} value={user.id} key={user.id} icon={getUserIcon(user)} />;
          })}
        </Form.Dropdown>
      ) : null}

      {users && users.length > 0 ? (
        <Form.TagPicker title="Members" placeholder="Add members" {...itemProps.memberIds}>
          {users?.map((user) => (
            <Form.TagPicker.Item key={user.id} value={user.id} title={user.name} icon={getUserIcon(user)} />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.DatePicker title="Start Date" type={Form.DatePicker.Type.Date} {...itemProps.startDate} />

      <Form.DatePicker title="Target Date" type={Form.DatePicker.Type.Date} {...itemProps.targetDate} />
    </Form>
  );
}
