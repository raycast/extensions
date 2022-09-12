import { Action, ActionPanel, Form, Icon, Toast, useNavigation } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { useState, useRef } from "react";

import { ProjectResult } from "../api/getProjects";

import useTeams from "../hooks/useTeams";
import useUsers from "../hooks/useUsers";
import useMilestones from "../hooks/useMilestones";

import { getLinearClient } from "../helpers/withLinearClient";
import { getTeamIcon } from "../helpers/teams";
import { getUserIcon } from "../helpers/users";
import { projectStatuses, projectStatusIcon, projectStatusText } from "../helpers/projects";
import { getErrorMessage } from "../helpers/errors";

type EditProjectProps = {
  project: ProjectResult;
  mutateProjects: MutatePromise<ProjectResult[] | undefined>;
};

export default function EditProjectForm({ project, mutateProjects }: EditProjectProps) {
  const { linearClient } = getLinearClient();

  const { pop } = useNavigation();

  const teamsField = useRef<Form.TextField>(null);

  const { teams, isLoadingTeams } = useTeams();
  const { users, isLoadingUsers } = useUsers();
  const { milestones, isLoadingMilestones } = useMilestones();

  const [teamIds, setTeamsIds] = useState<string[]>(project.teams.nodes.map((p) => p.id) || []);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [state, setState] = useState(project.state);
  const [leadId, setLeadId] = useState(project.lead?.id);
  const [memberIds, setMemberIds] = useState<string[]>(project.members.nodes.map((p) => p.id) || []);
  const [milestoneId, setMilestoneId] = useState(project.milestone?.id);
  const [startDate, setStartDate] = useState<Date | undefined>(
    project.startDate ? new Date(project.startDate) : undefined
  );
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    project.targetDate ? new Date(project.targetDate) : undefined
  );

  const [teamError, setTeamError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();

  async function editProject() {
    if (!name || teamIds.length === 0) {
      return;
    }

    const toast = new Toast({ style: Toast.Style.Animated, title: "Editing project" });
    await toast.show();

    try {
      const { success } = await linearClient.projectUpdate(project.id, {
        teamIds,
        name,
        description,
        state,
        ...(leadId ? { leadId } : {}),
        memberIds,
        ...(milestoneId ? { milestoneId } : {}),
        ...(startDate ? { startDate } : {}),
        ...(targetDate ? { targetDate } : {}),
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
  }

  function dropTeamErrorIfNeeded() {
    if (teamError && teamError.length > 0) {
      setTeamError(undefined);
    }
  }

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  return (
    <Form
      isLoading={isLoadingTeams || isLoadingUsers || isLoadingMilestones}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Project" onSubmit={editProject} />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="teamIds"
        title="Team(s)"
        ref={teamsField}
        value={teamIds}
        error={teamError}
        onChange={(teamIds) => {
          setTeamsIds(teamIds);
          dropNameErrorIfNeeded();
        }}
        placeholder="Add team"
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setTeamError("A project must belong to at least one team");
          } else {
            dropTeamErrorIfNeeded();
          }
        }}
      >
        {teams?.map((team) => (
          <Form.TagPicker.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team)} />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.TextField
        id="name"
        title="Name"
        placeholder="Project name"
        value={name}
        error={nameError}
        onChange={(title) => {
          setName(title);
          dropNameErrorIfNeeded();
        }}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setNameError("The name is required");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add some details (supports Markdown, e.g. **bold**)"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.Dropdown id="state" title="Status" value={state} onChange={setState} storeValue>
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
        <Form.Dropdown id="leadId" title="Lead" value={leadId} onChange={setLeadId} storeValue>
          <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

          {users?.map((user) => {
            return <Form.Dropdown.Item title={user.name} value={user.id} key={user.id} icon={getUserIcon(user)} />;
          })}
        </Form.Dropdown>
      ) : null}

      {users && users.length > 0 ? (
        <Form.TagPicker
          id="memberIds"
          title="Members"
          value={memberIds}
          onChange={setMemberIds}
          placeholder="Add members"
        >
          {users?.map((user) => (
            <Form.TagPicker.Item key={user.id} value={user.id} title={user.name} icon={getUserIcon(user)} />
          ))}
        </Form.TagPicker>
      ) : null}

      {milestones && milestones.length > 0 ? (
        <Form.Dropdown id="milestoneId" title="Milestone" value={milestoneId} onChange={setMilestoneId} storeValue>
          <Form.Dropdown.Item title="Upcoming" value="" icon={Icon.Map} />

          {milestones?.map((milestone) => {
            return (
              <Form.Dropdown.Item title={milestone.name} value={milestone.id} key={milestone.id} icon={Icon.Map} />
            );
          })}
        </Form.Dropdown>
      ) : null}

      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={startDate}
        onChange={setStartDate}
        type={Form.DatePicker.Type.Date}
      />

      <Form.DatePicker
        id="targetDate"
        title="Target Date"
        value={targetDate}
        onChange={setTargetDate}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}
