import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  Toast,
  confirmAlert,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { MulticaApiError, createIssue, listProjects } from "./lib/api";
import { BUILT_IN_STATUS_ORDER, PRIORITIES, actorIcon, issueUrl, statusIcon, statusOptions } from "./lib/format";
import { verifyPicks } from "./lib/picks";
import { WorkspaceContext, useWorkspace, useWorkspaceContext } from "./lib/hooks";
import type { ActorType, CreateIssueInput, Issue, Priority } from "./lib/types";
import { workspaceIcon } from "./components/WorkspaceDropdown";

interface FormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  project: string;
}

function parseAssignee(value: string): Pick<CreateIssueInput, "assignee_type" | "assignee_id"> {
  if (!value) return {};
  const [type, id] = value.split(":");
  return { assignee_type: type as ActorType, assignee_id: id };
}

/** The assignee values valid in this workspace, or undefined until agents and members load. */
function assigneeOptions(context: WorkspaceContext | undefined): string[] | undefined {
  if (!context?.agents || !context?.members) return undefined;
  return [...context.agents.map((a) => `agent:${a.id}`), ...context.members.map((m) => `member:${m.user_id}`)];
}

/** Built-in statuses are valid everywhere; custom ones need the workspace's list. */
function statusKeys(context: WorkspaceContext | undefined, value: string): string[] | undefined {
  if (context?.statuses) return statusOptions(context.statuses).map((s) => s.key);
  return BUILT_IN_STATUS_ORDER.includes(value) ? [value] : undefined;
}

export default function CreateIssue(props: LaunchProps<{ draftValues: FormValues }>) {
  const draft = props.draftValues;
  const { workspaces, workspace, setWorkspaceId, isLoading: workspaceLoading } = useWorkspace();
  const { context, isLoading: contextLoading } = useWorkspaceContext(workspace);
  const { data: projects, isLoading: projectsLoading } = useCachedPromise(listProjects, [workspace?.id ?? ""], {
    execute: Boolean(workspace),
  });

  async function submit(values: FormValues, allowDuplicate = false): Promise<boolean> {
    if (!workspace) return false;
    const picksOk = await verifyPicks<keyof FormValues>(
      [
        { field: "status", label: "status", value: values.status, options: statusKeys(context, values.status) },
        { field: "assignee", label: "assignee", value: values.assignee, options: assigneeOptions(context) },
        { field: "project", label: "project", value: values.project, options: projects?.map((p) => p.id) },
      ],
      workspace.name,
      (field) => setValue(field, field === "status" ? "todo" : ""),
    );
    if (!picksOk) return false;

    const input: CreateIssueInput = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      status: values.status || undefined,
      priority: (values.priority || "none") as Priority,
      project_id: values.project || undefined,
      allow_duplicate: allowDuplicate || undefined,
      ...parseAssignee(values.assignee),
    };

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });
    let issue: Issue;
    try {
      issue = await createIssue(workspace.id, input);
    } catch (error) {
      if (error instanceof MulticaApiError && error.code === "active_duplicate_issue" && !allowDuplicate) {
        await toast.hide();
        const existing = error.body?.issue as Issue | undefined;
        const createAnyway = await confirmAlert({
          title: "Possible duplicate",
          message: existing
            ? `${existing.identifier} "${existing.title}" looks like the same issue and is still open.`
            : error.message,
          icon: Icon.Duplicate,
          primaryAction: { title: "Create Anyway" },
          dismissAction: existing
            ? { title: `Open ${existing.identifier}`, onAction: () => open(issueUrl(workspace, existing)) }
            : { title: "Cancel", style: Alert.ActionStyle.Cancel },
        });
        return createAnyway ? submit(values, true) : false;
      }
      await showFailureToast(error, { title: "Couldn't create issue" });
      return false;
    }

    const url = issueUrl(workspace, issue);
    toast.style = Toast.Style.Success;
    toast.title = `Created ${issue.identifier}`;
    toast.message = issue.title;
    toast.primaryAction = {
      title: "Open in Browser",
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: () => open(url),
    };
    toast.secondaryAction = {
      title: "Copy URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(url),
    };
    return true;
  }

  const { handleSubmit, itemProps, reset, focus, setValue } = useForm<FormValues>({
    initialValues: {
      title: draft?.title ?? "",
      description: draft?.description ?? "",
      status: draft?.status ?? "todo",
      priority: draft?.priority ?? "none",
      assignee: draft?.assignee ?? "",
      project: draft?.project ?? "",
    },
    validation: { title: (value) => (value?.trim() ? undefined : "Title is required") },
    async onSubmit(values) {
      if (await submit(values)) {
        reset({ title: "", description: "", status: "todo", priority: "none", assignee: "", project: "" });
        focus("title");
      }
    },
  });

  // Projects and assignees belong to a workspace, so a switch clears them.
  function switchWorkspace(id: string) {
    if (id === workspace?.id) return;
    setWorkspaceId(id);
    setValue("project", "");
    setValue("assignee", "");
  }

  const agents = context?.agents?.filter((a) => !a.archived_at) ?? [];
  const members = context?.members ?? [];

  return (
    <Form
      isLoading={workspaceLoading || contextLoading || projectsLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {workspaces && workspaces.length > 1 && (
        <Form.Dropdown id="workspace" title="Workspace" value={workspace?.id} onChange={switchWorkspace}>
          {workspaces.map((w) => (
            <Form.Dropdown.Item key={w.id} value={w.id} title={w.name} icon={workspaceIcon(w)} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField title="Title" placeholder="What needs doing?" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Markdown supported" enableMarkdown {...itemProps.description} />
      <Form.Separator />
      <Form.Dropdown title="Status" {...itemProps.status}>
        {statusOptions(context?.statuses).map((s) => (
          <Form.Dropdown.Item key={s.key} value={s.key} title={s.name} icon={statusIcon(s.key, context?.statuses)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        {PRIORITIES.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.name} icon={p.icon} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Assignee" info="Agents pick up issues assigned to them." {...itemProps.assignee}>
        <Form.Dropdown.Item value="" title="Unassigned" icon={Icon.PersonCircle} />
        {context && agents.length > 0 && (
          <Form.Dropdown.Section title="Agents">
            {agents.map((a) => (
              <Form.Dropdown.Item
                key={a.id}
                value={`agent:${a.id}`}
                title={a.name}
                icon={actorIcon("agent", a.id, context)}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {context && members.length > 0 && (
          <Form.Dropdown.Section title="Members">
            {members.map((m) => (
              <Form.Dropdown.Item
                key={m.user_id}
                value={`member:${m.user_id}`}
                title={m.user_id === context.me?.id ? `${m.name} (me)` : m.name}
                icon={actorIcon("member", m.user_id, context)}
              />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      {projects && projects.length > 0 && (
        <Form.Dropdown title="Project" {...itemProps.project}>
          <Form.Dropdown.Item value="" title="No Project" icon={Icon.Minus} />
          {projects.map((p) => (
            <Form.Dropdown.Item key={p.id} value={p.id} title={p.icon ? `${p.icon} ${p.title}` : p.title} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
