import { Action, ActionPanel, Form, Icon, open, Toast, showToast, Keyboard } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import { getLinearClient } from "../api/linearClient";
import { getErrorMessage } from "../helpers/errors";
import { isLinearInstalled } from "../helpers/isLinearInstalled";
import { projectStatusIcon } from "../helpers/projects";
import { getTeamIcon } from "../helpers/teams";
import { getUserIcon } from "../helpers/users";
import useProjectStatuses from "../hooks/useProjectStatuses";
import useTeams from "../hooks/useTeams";
import useUsers from "../hooks/useUsers";
import { useWorkspaceCachedState } from "../hooks/useWorkspaceCachedState";

import { WorkspaceFormDropdown } from "./WorkspaceDropdown";

export type CreateProjectValues = {
  workspaceKey?: string;
  teamIds: string[];
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  startDate: Date | null;
  targetDate: Date | null;
  statusId: string;
};

export default function CreateProjectForm({
  draftValues,
  isLoading,
}: {
  draftValues?: CreateProjectValues;
  isLoading?: boolean;
}) {
  const { linearClient } = getLinearClient();

  const { teams, org, isLoadingTeams } = useTeams();
  const { users, isLoadingUsers } = useUsers();

  const [leadQuery, setLeadQuery] = useState<string>("");
  const { users: leads, supportsUserTypeahead, isLoadingUsers: isLoadingLeads } = useUsers(leadQuery);
  const { states, isLoadingStates } = useProjectStatuses();

  const { handleSubmit, itemProps, values, setValue, focus, reset } = useForm<CreateProjectValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating project" });

      try {
        const { success, project } = await linearClient.createProject({
          teamIds: values.teamIds,
          name: values.name,
          description: values.description,
          statusId: values.statusId,
          ...(values.leadId ? { leadId: values.leadId } : {}),
          memberIds: values.memberIds,
          ...(values.startDate ? { startDate: values.startDate } : {}),
          ...(values.targetDate ? { targetDate: values.targetDate } : {}),
        });

        const projectResult = await project;

        if (success && projectResult) {
          toast.style = Toast.Style.Success;
          toast.title = `Created Project`;

          toast.primaryAction = {
            title: isLinearInstalled ? "Open Project in Linear" : "Open Project in Browser",
            shortcut: Keyboard.Shortcut.Common.OpenWith,
            onAction: () => {
              if (isLinearInstalled) {
                open(projectResult.url, "Linear");
              } else {
                open(projectResult.url);
              }
            },
          };

          reset({
            teamIds: [],
            name: "",
            description: "",
            leadId: "",
            memberIds: [],
            startDate: null,
            targetDate: null,
          });
          focus("teamIds");
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create project";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      teamIds: FormValidation.Required,
      name: FormValidation.Required,
    },
    initialValues: {
      teamIds: draftValues?.teamIds || [],
      name: draftValues?.name,
      description: draftValues?.description,
      statusId: draftValues?.statusId,
      leadId: draftValues?.leadId,
      memberIds: draftValues?.memberIds || [],
      startDate: draftValues?.startDate,
      targetDate: draftValues?.targetDate,
    },
  });

  type StoredProjectDefaults = Partial<Pick<CreateProjectValues, "statusId" | "leadId">>;
  const [storedDefaults, setStoredDefaults] = useWorkspaceCachedState<StoredProjectDefaults>(
    "create-project-defaults",
    {},
  );
  const restoredRef = useRef(false);
  // PER-FIELD READINESS, same semantics as CreateIssueForm: a field's value is written
  // back only once that field's own restore has completed (see that file for the full
  // rationale).
  const readyFieldsRef = useRef<Set<keyof StoredProjectDefaults>>(new Set());

  useEffect(() => {
    if (!restoredRef.current) return;
    const ready = readyFieldsRef.current;
    setStoredDefaults({
      ...storedDefaults,
      ...(ready.has("statusId") ? { statusId: values.statusId } : {}),
      ...(ready.has("leadId") ? { leadId: values.leadId } : {}),
    });
    // storedDefaults intentionally omitted from deps: it's only read here (via the
    // spread above) to preserve fields not yet ready, and including it would loop this
    // effect against its own setStoredDefaults call.
  }, [values.statusId, values.leadId]);

  // Status and Lead load independently here (no team-dependency chain like
  // CreateIssueForm), so each restores once its own option list has loaded, validated
  // against THIS workspace's data (discard-on-restore, §4.5), then marks itself ready
  // regardless of whether a value applied.
  useEffect(() => {
    if (readyFieldsRef.current.has("statusId") || isLoadingStates) return;
    // Draft launches mark nothing ready (I4): the persist effect above only writes
    // fields in readyFieldsRef, so leaving it unset here keeps a draft launch from ever
    // clobbering the remembered per-workspace defaults.
    if (!draftValues) {
      if (storedDefaults.statusId && states?.some((status) => status.id === storedDefaults.statusId)) {
        setValue("statusId", storedDefaults.statusId);
      }
      readyFieldsRef.current.add("statusId");
    }
    restoredRef.current = true;
  }, [isLoadingStates, states]);

  useEffect(() => {
    if (readyFieldsRef.current.has("leadId") || isLoadingLeads) return;
    // Draft launches mark nothing ready (I4) — see the statusId restore effect above.
    if (!draftValues) {
      if (storedDefaults.leadId && leads?.some((user) => user.id === storedDefaults.leadId)) {
        setValue("leadId", storedDefaults.leadId);
      }
      readyFieldsRef.current.add("leadId");
    }
    restoredRef.current = true;
  }, [isLoadingLeads, leads]);

  return (
    <Form
      enableDrafts
      isLoading={isLoadingTeams || isLoadingUsers || isLoadingLeads || isLoadingStates || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <WorkspaceFormDropdown />

      <Form.TagPicker title="Team(s)" placeholder="Add team" {...itemProps.teamIds}>
        {teams?.map((team) => (
          <Form.TagPicker.Item key={team.id} value={team.id} title={team.name} icon={getTeamIcon(team, org)} />
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

      <Form.Dropdown title="Status" {...itemProps.statusId}>
        {states?.map((status) => (
          <Form.Dropdown.Item
            key={status.id}
            value={status.id}
            title={status.name}
            icon={{ source: projectStatusIcon[status.type], tintColor: status.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Lead"
        {...itemProps.leadId}
        {...(supportsUserTypeahead && { onSearchTextChange: setLeadQuery, throttle: true, isLoading: isLoadingLeads })}
      >
        <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

        {leads?.map((user) => {
          return <Form.Dropdown.Item title={user.name} value={user.id} key={user.id} icon={getUserIcon(user)} />;
        })}
      </Form.Dropdown>

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
