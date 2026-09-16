import { Action, ActionPanel, Form, getPreferenceValues, Icon, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { createIssue, linearOAuth, loadDashboard } from "./api";
import { buildDashboard, DashboardModel } from "./dashboard";

type FormValues = {
  teamId: string;
  title: string;
  description: string;
  stateId: string;
  projectId: string;
  priority: string;
};

function QuickCapture() {
  const preferences = getPreferenceValues<Preferences.QuickCapture>();
  const { data, isLoading: isLoadingData } = useCachedPromise(loadDashboard);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  let model: DashboardModel | undefined;
  let buildError: Error | undefined;
  try {
    model = data ? buildDashboard(data, preferences) : undefined;
  } catch (error) {
    buildError = error instanceof Error ? error : new Error(String(error));
  }

  const selectedTeam = model?.teams.find((team) => team.id === selectedTeamId) || model?.team || model?.teams[0];

  async function submit(values: FormValues) {
    if (!model || !values.title.trim()) return;
    const team = model.teams.find((candidate) => candidate.id === values.teamId) || model.team;
    setIsSubmitting(true);
    try {
      const issue = await createIssue({
        teamId: team.id,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        stateId: values.stateId || undefined,
        projectId: values.projectId || undefined,
        priority: Number(values.priority),
      });
      await showToast({ style: Toast.Style.Success, title: `Created ${issue.identifier}` });
      await popToRoot();
      if (!preferences.demoMode) await open(issue.url);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create issue",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const availableStates = selectedTeam?.states.nodes || [];
  const defaultState = availableStates.find((state) => state.type === "unstarted")?.id || "";
  return (
    <Form
      isLoading={isLoadingData || isSubmitting}
      navigationTitle="Quick Capture · Linear"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {buildError ? <Form.Description title="Linear could not load" text={buildError.message} /> : null}
      <Form.Dropdown id="teamId" title="Team" value={selectedTeam?.id || ""} onChange={setSelectedTeamId}>
        {model?.teams.map((team) => (
          <Form.Dropdown.Item key={team.id} value={team.id} title={`${team.name} (${team.key})`} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="What needs to happen?" autoFocus />
      <Form.TextArea
        id="description"
        title="Context"
        placeholder="Outcome, constraints, evidence, or acceptance criteria"
      />
      <Form.Dropdown key={`state-${selectedTeam?.id}`} id="stateId" title="Status" defaultValue={defaultState}>
        {availableStates
          .filter((state) => ["unstarted", "started"].includes(state.type))
          .map((state) => (
            <Form.Dropdown.Item key={state.id} value={state.id} title={state.name} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        <Form.Dropdown.Item value="0" title="No priority" />
        <Form.Dropdown.Item value="1" title="Urgent" />
        <Form.Dropdown.Item value="2" title="High" />
        <Form.Dropdown.Item value="3" title="Medium" />
        <Form.Dropdown.Item value="4" title="Low" />
      </Form.Dropdown>
      <Form.Dropdown key={`project-${selectedTeam?.id}`} id="projectId" title="Project" defaultValue="">
        <Form.Dropdown.Item value="" title="No project" />
        {selectedTeam?.projects.nodes.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default withAccessToken(linearOAuth)(QuickCapture);
