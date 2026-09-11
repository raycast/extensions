import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
  Icon,
  Color,
  Image,
} from "@raycast/api";
import { BASE_URL } from "./shared";

type FormValues = {
  workspaceId: string;
  listId: string;
  statusId: string;
  title: string;
  description?: string;
  priority: string;
  startDate?: Date;
  dueDate?: Date;
  assigneeIds?: string[];
};

type Workspace = { id: number; name: string };
type ListItem = { id: number; name: string };
type Status = { id: number; name: string; color: string; category: string };
type Member = { id: number; name: string; avatar_url?: string };

const PRIORITY_OPTIONS = [
  { value: "urgent", title: "Urgent", icon: { source: Icon.FullSignal, tintColor: Color.Red } },
  { value: "high", title: "High", icon: { source: Icon.Signal3, tintColor: Color.SecondaryText } },
  { value: "medium", title: "Medium", icon: { source: Icon.Signal2, tintColor: Color.SecondaryText } },
  { value: "low", title: "Low", icon: { source: Icon.Signal1, tintColor: Color.SecondaryText } },
  { value: "none", title: "None", icon: { source: Icon.Signal0, tintColor: Color.SecondaryText } },
];

const STATUS_CATEGORY_ICON: Record<string, { source: Icon; tintColor: Color }> = {
  pending: { source: Icon.Circle, tintColor: Color.SecondaryText },
  in_progress: { source: Icon.Clock, tintColor: Color.Orange },
  completed: { source: Icon.CheckCircle, tintColor: Color.Green },
  cancelled: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await fetch(`${BASE_URL}/workspaces`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error("Failed to fetch workspaces");
        const data: Workspace[] = await res.json();
        setWorkspaces(data);
        if (data.length > 0) setSelectedWorkspaceId(String(data[0].id));
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Could not load workspaces" });
      } finally {
        setIsLoadingWorkspaces(false);
      }
    }
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    async function fetchListsAndStatuses() {
      setIsLoadingData(true);
      try {
        const [listsRes, statusesRes, membersRes] = await Promise.all([
          fetch(`${BASE_URL}/workspaces/${selectedWorkspaceId}/lists`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          }),
          fetch(`${BASE_URL}/workspaces/${selectedWorkspaceId}/statuses`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          }),
          fetch(`${BASE_URL}/workspaces/${selectedWorkspaceId}/members`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          }),
        ]);
        if (!listsRes.ok) throw new Error("Failed to fetch lists");
        if (!statusesRes.ok) throw new Error("Failed to fetch statuses");
        const [listsData, statusesData, membersData]: [ListItem[], Status[], Member[]] = await Promise.all([
          listsRes.json(),
          statusesRes.json(),
          membersRes.ok ? membersRes.json() : Promise.resolve([]),
        ]);
        setLists(listsData);
        setStatuses(statusesData);
        setMembers(membersData);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Could not load lists / statuses" });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchListsAndStatuses();
  }, [selectedWorkspaceId]);

  async function handleSubmit(values: FormValues) {
    const title = values.title?.trim();
    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Task title is required" });
      return;
    }

    if (!values.listId) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a list" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Creating task…" });

    try {
      const res = await fetch(`${BASE_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          list_id: Number(values.listId),
          status_id: values.statusId ? Number(values.statusId) : undefined,
          title,
          description: values.description?.trim() || null,
          priority: values.priority,
          start_date: values.startDate ? values.startDate.toISOString() : null,
          due_date: values.dueDate ? values.dueDate.toISOString() : null,
          assignee_ids:
            values.assigneeIds && values.assigneeIds.length > 0 ? values.assigneeIds.map(Number) : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || result?.message || "Failed to create task");
      await showToast({ style: Toast.Style.Success, title: "Task created", message: result.title });
      await popToRoot();
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to create task",
        message: error instanceof Error ? error.message : "Request failed",
      });
    }
  }

  return (
    <Form
      isLoading={isLoadingWorkspaces || isLoadingData}
      navigationTitle="Create Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspaceId" title="Workspace" onChange={setSelectedWorkspaceId}>
        {workspaces.map((w) => (
          <Form.Dropdown.Item
            key={w.id}
            value={String(w.id)}
            title={w.name}
            icon={{ source: Icon.Building, tintColor: Color.SecondaryText }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="listId" title="List">
        {lists.map((l) => (
          <Form.Dropdown.Item
            key={l.id}
            value={String(l.id)}
            title={l.name}
            icon={{ source: Icon.BulletPoints, tintColor: Color.SecondaryText }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="statusId" title="Status">
        {statuses.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={String(s.id)}
            title={s.name}
            icon={STATUS_CATEGORY_ICON[s.category] ?? { source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="medium">
        {PRIORITY_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={o.value} title={o.title} icon={o.icon} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="Enter task title" />
      <Form.TextArea id="description" title="Description" placeholder="Optional description" />
      <Form.TagPicker id="assigneeIds" title="Assignees" placeholder="Select assignees">
        {members.map((m) => (
          <Form.TagPicker.Item
            key={m.id}
            value={String(m.id)}
            title={m.name}
            icon={
              m.avatar_url
                ? { source: m.avatar_url, mask: Image.Mask.Circle }
                : { source: Icon.Person, tintColor: Color.SecondaryText }
            }
          />
        ))}
      </Form.TagPicker>
      <Form.DatePicker id="startDate" title="Start Date" type={Form.DatePicker.Type.DateTime} />
      <Form.DatePicker id="dueDate" title="Due Date" type={Form.DatePicker.Type.DateTime} />
    </Form>
  );
}
