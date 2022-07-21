import { Action, ActionPanel, Form, Icon, open, Toast } from "@raycast/api";
import { useState, useRef } from "react";

import useTeams from "../hooks/useTeams";
import useUsers from "../hooks/useUsers";
import useMilestones from "../hooks/useMilestones";

import { getLinearClient } from "../helpers/withLinearClient";
import { getTeamIcon } from "../helpers/teams";
import { getUserIcon } from "../helpers/users";
import { projectStatuses, projectStatusIcon, projectStatusText } from "../helpers/projects";
import { getErrorMessage } from "../helpers/errors";
import { isLinearInstalled } from "../helpers/isLinearInstalled";

export type CreateProjectValues = {
  teamIds: string[];
  name: string;
  description: string;
  state: string;
  leadId: string;
  memberIds: string[];
  milestoneId: string;
  startDate: Date;
  targetDate: Date;
};

export default function CreateProjectForm({ draftValues }: { draftValues?: CreateProjectValues }) {
  const { linearClient } = getLinearClient();

  const teamsField = useRef<Form.TextField>(null);

  const { teams, isLoadingTeams } = useTeams();
  const { users, isLoadingUsers } = useUsers();
  const { milestones, isLoadingMilestones } = useMilestones();

  const [teamIds, setTeamsIds] = useState<string[]>(draftValues?.teamIds || []);
  const [name, setName] = useState(draftValues?.name);
  const [description, setDescription] = useState(draftValues?.description);
  const [state, setState] = useState(draftValues?.state);
  const [leadId, setLeadId] = useState(draftValues?.leadId);
  const [memberIds, setMemberIds] = useState<string[]>(draftValues?.memberIds || []);
  const [milestoneId, setMilestoneId] = useState(draftValues?.milestoneId);
  const [startDate, setStartDate] = useState(draftValues?.startDate);
  const [targetDate, setTargetDate] = useState(draftValues?.targetDate);

  const [teamError, setTeamError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();

  async function createProject() {
    if (!name || teamIds.length === 0) {
      return;
    }

    const toast = new Toast({ style: Toast.Style.Animated, title: "Creating project" });
    await toast.show();

    try {
      const { success, project } = await linearClient.projectCreate({
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

      const projectResult = await project;

      if (success && projectResult) {
        toast.style = Toast.Style.Success;
        toast.title = `Created Project`;

        toast.primaryAction = {
          title: isLinearInstalled ? "Open Project in Linear" : "Open Project in Browser",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: () => {
            isLinearInstalled ? open(projectResult.url, "Linear") : open(projectResult.url);
          },
        };

        setName("");
        setTeamsIds([]);
        setDescription("");
        setMemberIds([]);
        setStartDate(undefined);
        setTargetDate(undefined);

        teamsField.current?.focus();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create project";
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
      enableDrafts={true}
      isLoading={isLoadingTeams || isLoadingUsers || isLoadingMilestones}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={createProject} />
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
