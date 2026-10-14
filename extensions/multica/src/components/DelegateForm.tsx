import { Action, ActionPanel, Color, Form, Icon, Image, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { MulticaApiError, listProjects, listSquads, quickCreateIssue } from "../lib/api";
import { PRIORITIES, actorIcon, avatarIcon } from "../lib/format";
import { useWorkspace, useWorkspaceContext } from "../lib/hooks";
import type { Agent, Issue, Priority, QuickCreateInput, Squad } from "../lib/types";
import { workspaceIcon } from "./WorkspaceDropdown";

export interface DelegateFormValues {
  prompt: string;
  actor: string;
  priority: string;
  project: string;
  dueDate: Date | null;
}

const AVAILABILITY_ORDER = ["online", "unstable", "offline"];

function isReachable(agent: Agent): boolean {
  return agent.runtime_availability !== "offline" && agent.status !== "offline";
}

function availabilityNote(agent: Agent): string {
  if (!isReachable(agent)) return " (offline)";
  if (agent.runtime_availability === "unstable") return " (unstable)";
  return "";
}

function squadIcon(squad: Squad): Image.ImageLike {
  return avatarIcon(squad.avatar_url) ?? { source: Icon.TwoPeople, tintColor: Color.Purple };
}

/** YYYY-MM-DD in local time, the calendar date the user picked. */
function calendarDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function delegateErrorMessage(error: unknown, actorName: string): string | undefined {
  if (!(error instanceof MulticaApiError)) return undefined;
  if (error.code === "daemon_version_unsupported") {
    const current = error.body?.current_version;
    const minimum = error.body?.min_version;
    return `${actorName}'s machine runs Multica CLI ${current ?? "(unknown)"}. Delegating needs ${minimum ?? "a newer version"} or later.`;
  }
  return error.message;
}

/**
 * Multica's "Agent mode" issue creation: the prompt goes to an agent (or a
 * squad's leader), which writes and files the issue in the background. The
 * result arrives as an inbox notification.
 */
export function DelegateForm(props: { parentIssue?: Issue; draftValues?: DelegateFormValues }) {
  const { parentIssue, draftValues } = props;
  const { pop } = useNavigation();
  const {
    workspaces,
    workspace,
    setWorkspaceId,
    isLoading: workspaceLoading,
  } = useWorkspace(parentIssue?.workspace_id);
  const { context, isLoading: contextLoading } = useWorkspaceContext(workspace);
  const workspaceId = workspace?.id ?? "";
  const { data: squads, isLoading: squadsLoading } = useCachedPromise(listSquads, [workspaceId], {
    execute: Boolean(workspace),
  });
  const { data: projects, isLoading: projectsLoading } = useCachedPromise(listProjects, [workspaceId], {
    execute: Boolean(workspace),
  });
  const [lastActor, setLastActor] = useCachedState<Record<string, string>>("delegate-actor-by-workspace", {});

  const agents = [...(context?.agents ?? [])]
    .filter((a) => !a.archived_at)
    .sort(
      (a, b) =>
        AVAILABILITY_ORDER.indexOf(a.runtime_availability ?? "offline") -
        AVAILABILITY_ORDER.indexOf(b.runtime_availability ?? "offline"),
    );
  const activeSquads = squads?.filter((s) => !s.archived_at) ?? [];
  const actorValues = [...agents.map((a) => `agent:${a.id}`), ...activeSquads.map((s) => `squad:${s.id}`)];

  function actorLabel(value: string): string {
    const [type, id] = value.split(":");
    if (type === "squad") return squads?.find((s) => s.id === id)?.name ?? "The squad";
    return agents.find((a) => a.id === id)?.name ?? "The agent";
  }

  const { handleSubmit, itemProps, values, setValue, reset, focus } = useForm<DelegateFormValues>({
    initialValues: {
      prompt: draftValues?.prompt ?? "",
      actor: draftValues?.actor ?? "",
      priority: draftValues?.priority ?? "",
      project: draftValues?.project ?? parentIssue?.project_id ?? "",
      dueDate: draftValues?.dueDate ?? null,
    },
    validation: {
      prompt: (value) => (value?.trim() ? undefined : "Describe what needs doing"),
      actor: (value) => (value ? undefined : "Pick an agent or squad"),
    },
    async onSubmit(formValues) {
      if (!workspace) return;
      const [type, id] = formValues.actor.split(":");
      const name = actorLabel(formValues.actor);
      const input: QuickCreateInput = {
        prompt: formValues.prompt.trim(),
        ...(type === "squad" ? { squad_id: id } : { agent_id: id }),
        priority: (formValues.priority || undefined) as Exclude<Priority, "none"> | undefined,
        project_id: formValues.project || undefined,
        due_date: formValues.dueDate ? calendarDate(formValues.dueDate) : undefined,
        parent_issue_id: parentIssue?.id,
      };

      const toast = await showToast({ style: Toast.Style.Animated, title: `Sending to ${name}` });
      try {
        await quickCreateIssue(workspace.id, input);
      } catch (error) {
        await showFailureToast(error, {
          title: `Couldn't delegate to ${name}`,
          message: delegateErrorMessage(error, name),
        });
        return;
      }

      setLastActor({ ...lastActor, [workspace.id]: formValues.actor });
      toast.style = Toast.Style.Success;
      toast.title = `${name} is writing the issue`;
      toast.message = "You'll get an inbox notification when it's filed.";

      if (parentIssue) {
        pop();
      } else {
        reset({ ...formValues, prompt: "", dueDate: null });
        focus("prompt");
      }
    },
  });

  // Once agents load, default to the last pick for this workspace, else the first reachable agent.
  useEffect(() => {
    if (!actorValues.length || actorValues.includes(values.actor)) return;
    const remembered = lastActor[workspaceId];
    const firstReachable = agents.find(isReachable);
    const fallback = firstReachable ? `agent:${firstReachable.id}` : actorValues[0];
    setValue("actor", remembered && actorValues.includes(remembered) ? remembered : fallback);
  }, [actorValues.join(","), workspaceId]);

  const selectedAgent = agents.find((a) => `agent:${a.id}` === values.actor);

  return (
    <Form
      navigationTitle={parentIssue ? `Delegate Sub-Issue of ${parentIssue.identifier}` : "Delegate Task"}
      isLoading={workspaceLoading || contextLoading || squadsLoading || projectsLoading}
      enableDrafts={!parentIssue}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delegate" icon={Icon.Stars} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {parentIssue ? (
        <Form.Description title="Sub-issue of" text={`${parentIssue.identifier} ${parentIssue.title}`} />
      ) : (
        workspaces &&
        workspaces.length > 1 && (
          <Form.Dropdown id="workspace" title="Workspace" value={workspace?.id} onChange={setWorkspaceId}>
            {workspaces.map((w) => (
              <Form.Dropdown.Item key={w.id} value={w.id} title={w.name} icon={workspaceIcon(w)} />
            ))}
          </Form.Dropdown>
        )
      )}
      <Form.TextArea
        title="Prompt"
        placeholder="Describe the work. The agent writes the title and description and files the issue."
        enableMarkdown
        {...itemProps.prompt}
      />
      <Form.Dropdown
        title="Agent"
        info="This agent writes and files the issue. Picking a squad hands it to the squad's leader."
        {...itemProps.actor}
      >
        {context && agents.length > 0 && (
          <Form.Dropdown.Section title="Agents">
            {agents.map((a) => (
              <Form.Dropdown.Item
                key={a.id}
                value={`agent:${a.id}`}
                title={`${a.name}${availabilityNote(a)}`}
                icon={actorIcon("agent", a.id, context)}
                keywords={[a.model ?? "", a.description]}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {activeSquads.length > 0 && (
          <Form.Dropdown.Section title="Squads">
            {activeSquads.map((s) => (
              <Form.Dropdown.Item key={s.id} value={`squad:${s.id}`} title={s.name} icon={squadIcon(s)} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      {selectedAgent && !isReachable(selectedAgent) && (
        <Form.Description text="⚠️ This agent's runtime is offline, so Multica will refuse the request. Pick another agent or start its machine." />
      )}
      <Form.Separator />
      <Form.Dropdown title="Priority" info="Leave unset to let the agent decide." {...itemProps.priority}>
        <Form.Dropdown.Item value="" title="Let the Agent Decide" icon={Icon.Stars} />
        {PRIORITIES.filter((p) => p.value !== "none").map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.name} icon={p.icon} />
        ))}
      </Form.Dropdown>
      {projects && projects.length > 0 && (
        <Form.Dropdown title="Project" {...itemProps.project}>
          <Form.Dropdown.Item value="" title="Let the Agent Decide" icon={Icon.Stars} />
          {projects.map((p) => (
            <Form.Dropdown.Item key={p.id} value={p.id} title={p.icon ? `${p.icon} ${p.title}` : p.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />
    </Form>
  );
}
