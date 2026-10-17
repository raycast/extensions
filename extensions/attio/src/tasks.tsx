import { failToast } from "@chrismessina/raycast-kit";
import { countOf } from "@chrismessina/raycast-kit/plural";
import { differenceInDays, format, formatDistanceToNow, isBefore, isToday } from "date-fns";
import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { createTask, deleteTask, listTasks, updateTask } from "./api/endpoints";
import { DEFAULT_PAGE_SIZE as PAGE_SIZE, satisfied } from "./api/operations";
import type { Task } from "./api/types";
import ExportActions from "./components/ExportActions";
import { guard } from "./components/Guard";
import TaskEditForm from "./components/TaskEditForm";
import { useAttio } from "./hooks/useAttio";
import { useMembers } from "./hooks/useMembers";
import { friendlyDay } from "./lib/friendly-date";

type Filter = "all" | "mine" | "open" | "completed";
type TaskSort = "deadline-asc" | "deadline-desc" | "created-desc";

const MAX_ASSIGNEE_AVATARS = 2;

const buildAccessories = (
  task: Task,
  currentDate: Date,
  members: { nameFor: (actorId: string) => string | undefined; avatarFor: (actorId: string) => string | undefined },
  showDueDate: boolean,
) => {
  const accessories: List.Item.Accessory[] = [];
  const { deadline_at, linked_records, assignees } = task;
  if (deadline_at && showDueDate) {
    const date = new Date(deadline_at);
    let value = "Due ";
    const color = !isToday(date) && isBefore(date, currentDate) ? Color.Red : Color.Orange;

    const days = Math.abs(differenceInDays(date, currentDate));
    if (days >= 5) {
      value += format(date, "MMM d, yyyy");
    } else if (isToday(date)) {
      value += "today";
    } else {
      value += formatDistanceToNow(date, { addSuffix: true });
    }
    accessories.push({ text: { value, color } });
  }
  accessories.push({
    icon: Icon.Document,
    text: linked_records.length.toString(),
    tooltip: countOf(linked_records.length, "record"),
  });
  assignees.slice(0, MAX_ASSIGNEE_AVATARS).forEach((a) => {
    accessories.push({
      icon: members.avatarFor(a.referenced_actor_id)
        ? { source: members.avatarFor(a.referenced_actor_id)!, mask: Image.Mask.RoundedRectangle }
        : Icon.Person,
      tooltip: members.nameFor(a.referenced_actor_id) ?? "Assignee",
    });
  });
  if (assignees.length > MAX_ASSIGNEE_AVATARS) {
    accessories.push({ text: `+${assignees.length - MAX_ASSIGNEE_AVATARS}` });
  }
  return accessories;
};

export default function Tasks({ initialFilter = "all" }: { initialFilter?: Filter } = {}) {
  const [sort, setSort] = useCachedState<TaskSort>("tasks-sort", "deadline-asc");
  const h = useAttio(
    "listTasks",
    // The API defaults to created_at:asc (oldest first), so "Created ↓" must
    // ask for the reverse server-side; sort is a dep so pagination restarts.
    (taskSort: TaskSort) =>
      async ({ page }: { page: number }) => {
        const { data } = await listTasks({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sort: taskSort === "created-desc" ? "created_at:desc" : undefined,
        });
        return { data, hasMore: data.length === PAGE_SIZE };
      },
    [sort],
  );
  const { isLoading, data, pagination, error, revalidate, mutate, self } = h;
  // Raycast invokes Action.Push's onPop DURING the navigation re-render, so a
  // bare `revalidate` there setStates Tasks mid-render ("Cannot update a
  // component (Tasks) while rendering InternalNavigationRoot", live 2026-09-08).
  // Defer it out of the render pass.
  const revalidateAfterPop = () => setTimeout(revalidate, 0);
  const members = useMembers();
  const allTasks: Task[] = data ?? [];
  const currentDate = useMemo(() => new Date(), []);
  const canWrite = satisfied(self.granted, "task:read-write");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [groupByDue, setGroupByDue] = useCachedState<boolean>("tasks-group-by-due", false);

  const filteredTasks = allTasks.filter((task) => {
    switch (filter) {
      case "mine":
        return task.assignees.some((a) => a.referenced_actor_id === self.memberId);
      case "open":
        return !task.is_completed;
      case "completed":
        return task.is_completed;
      default:
        return true;
    }
  });

  // "created-desc" is served newest-first by the API (sort=created_at:desc in
  // the hook) — the no-op comparator just preserves that server order.
  const tasks = [...filteredTasks].sort((a, b) => {
    if (sort === "created-desc") return 0;
    if (!a.deadline_at && !b.deadline_at) return 0;
    if (!a.deadline_at) return 1;
    if (!b.deadline_at) return -1;
    const diff = new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
    return sort === "deadline-desc" ? -diff : diff;
  });

  // Group-by-due-date sections: friendly day label as section title, insertion
  // order follows `tasks` (already sorted), "No Due Date" bucket last.
  // When not filtering by completed, separate completed tasks into final section.
  const dueDateSections = useMemo(() => {
    if (!groupByDue) return [];
    const isCompletedFilter = filter === "completed";
    const tasksToGroup = isCompletedFilter ? tasks : tasks.filter((t) => !t.is_completed);
    const completedTasks = isCompletedFilter ? [] : tasks.filter((t) => t.is_completed);

    const order: string[] = [];
    const buckets = new Map<string, Task[]>();
    const noDue: Task[] = [];
    for (const task of tasksToGroup) {
      if (!task.deadline_at) {
        noDue.push(task);
        continue;
      }
      const dayKey = task.deadline_at.includes("T") ? task.deadline_at.slice(0, 10) : task.deadline_at;
      const label = friendlyDay(dayKey);
      if (!buckets.has(label)) {
        buckets.set(label, []);
        order.push(label);
      }
      buckets.get(label)!.push(task);
    }
    const sections = order.map((label) => ({ title: label, tasks: buckets.get(label)! }));
    if (noDue.length) sections.push({ title: "No Due Date", tasks: noDue });
    if (completedTasks.length > 0) sections.push({ title: "Completed", tasks: completedTasks });
    return sections;
  }, [groupByDue, tasks, filter]);

  const g = guard(h.guardInput(tasks.length > 0));
  if (g) return g;

  const toggleTask = async (task: Task) => {
    const { task_id } = task.id;
    const toast = await showToast(Toast.Style.Animated, "Toggling", task_id);
    try {
      const { is_completed } = task;
      await mutate(updateTask(task_id, { is_completed: !is_completed }), {
        optimisticUpdate(data: Task[] | undefined) {
          return (data ?? []).map((t) => (t.id.task_id === task_id ? { ...t, is_completed: !is_completed } : t));
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Toggled";
    } catch (error) {
      failToast(toast, error, { title: "Failed" });
    }
  };
  const confirmAndDelete = async (task: Task) => {
    const options: Alert.Options = {
      title: "Delete task",
      message: "Are you sure you want to delete this task?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (!(await confirmAlert(options))) return;
    const { task_id } = task.id;
    const toast = await showToast(Toast.Style.Animated, "Deleting", task_id);
    try {
      await mutate(deleteTask(task_id), {
        optimisticUpdate(data: Task[] | undefined) {
          return (data ?? []).filter((t) => t.id.task_id !== task_id);
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      failToast(toast, error, { title: "Failed" });
    }
  };

  const newTaskAction = canWrite ? (
    <Action.Push
      icon={Icon.Plus}
      title="New Task"
      target={<NewTask />}
      onPop={revalidateAfterPop}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  ) : null;

  // CURRENTLY LOADED rows only (the filtered+sorted `tasks` list), not a re-fetch.
  const exportAction = (
    <ExportActions
      filenameBase="tasks"
      columns={["Content", "Due", "Completed", "Assignees"]}
      rows={tasks.map((t) => [
        t.content_plaintext,
        t.deadline_at ?? "",
        t.is_completed ? "Yes" : "No",
        t.assignees.map((a) => members.nameFor(a.referenced_actor_id) ?? a.referenced_actor_id).join(", "),
      ])}
    />
  );

  const sortSubmenu = (
    <ActionPanel.Submenu title="Sort by" icon={Icon.ChevronUpDown}>
      <Action
        title="Due Date ↑"
        icon={sort === "deadline-asc" ? Icon.Check : undefined}
        onAction={() => setSort("deadline-asc")}
      />
      <Action
        title="Due Date ↓"
        icon={sort === "deadline-desc" ? Icon.Check : undefined}
        onAction={() => setSort("deadline-desc")}
      />
      <Action
        title="Created ↓"
        icon={sort === "created-desc" ? Icon.Check : undefined}
        onAction={() => setSort("created-desc")}
      />
    </ActionPanel.Submenu>
  );

  const viewActionsSection = (
    <ActionPanel.Section title="View">
      {sortSubmenu}
      <Action title="Toggle Group by Due Date" icon={Icon.Calendar} onAction={() => setGroupByDue((v) => !v)} />
    </ActionPanel.Section>
  );

  const TaskItem = ({ task }: { task: Task }) => (
    <List.Item
      icon={task.is_completed ? Icon.CheckCircle : Icon.Circle}
      title={task.content_plaintext}
      accessories={buildAccessories(task, currentDate, members, !groupByDue)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {canWrite && (
              <Action
                icon={task.is_completed ? Icon.Circle : Icon.CheckCircle}
                title={task.is_completed ? "Mark as Incomplete" : "Mark as Complete"}
                onAction={() => toggleTask(task)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit">
            {canWrite && (
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Task"
                target={<TaskEditForm task={task} />}
                onPop={revalidateAfterPop}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
            )}
            {newTaskAction}
            {canWrite && (
              <Action
                icon={Icon.Trash}
                title="Delete Task"
                onAction={() => confirmAndDelete(task)}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Task Content" content={task.content_plaintext} />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            {sortSubmenu}
            <Action title="Toggle Group by Due Date" icon={Icon.Calendar} onAction={() => setGroupByDue((v) => !v)} />
          </ActionPanel.Section>
          <ActionPanel.Section>{exportAction}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      if (task.is_completed) {
        acc.completed.push(task);
      } else if (
        !task.deadline_at ||
        isToday(new Date(task.deadline_at)) ||
        isBefore(new Date(task.deadline_at), currentDate)
      ) {
        acc.today.push(task);
      } else {
        acc.upcoming.push(task);
      }
      return acc;
    },
    { today: [], upcoming: [], completed: [] } as { today: Task[]; upcoming: Task[]; completed: Task[] },
  );

  const filterDropdown = (
    <List.Dropdown
      tooltip="Filter"
      {...(initialFilter === "all" ? { storeValue: true } : { defaultValue: initialFilter })}
      onChange={(v) => setFilter(v as Filter)}
    >
      <List.Dropdown.Item title="All Tasks" value="all" />
      <List.Dropdown.Item title="My Tasks" value="mine" />
      <List.Dropdown.Item title="Open" value="open" />
      <List.Dropdown.Item title="Completed" value="completed" />
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={filterDropdown}
      actions={
        <ActionPanel>
          {newTaskAction}
          {exportAction}
          {viewActionsSection}
        </ActionPanel>
      }
    >
      {!isLoading && !tasks.length && !error ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={
            filter === "mine" ? "No tasks assigned to you" : filter === "completed" ? "No completed tasks" : "Tasks"
          }
          description={filter === "mine" ? "Tasks assigned to you will appear here." : "No tasks yet!"}
          actions={
            <ActionPanel>
              {newTaskAction}
              {viewActionsSection}
            </ActionPanel>
          }
        />
      ) : groupByDue ? (
        <>
          {dueDateSections.map((section) => (
            <List.Section key={section.title} title={section.title} subtitle={section.tasks.length.toString()}>
              {section.tasks.map((task) => (
                <TaskItem key={task.id.task_id} task={task} />
              ))}
            </List.Section>
          ))}
        </>
      ) : (
        <>
          <List.Section title="Today" subtitle={groupedTasks.today.length.toString()}>
            {groupedTasks.today.map((task) => (
              <TaskItem key={task.id.task_id} task={task} />
            ))}
          </List.Section>
          <List.Section title="Upcoming" subtitle={groupedTasks.upcoming.length.toString()}>
            {groupedTasks.upcoming.map((task) => (
              <TaskItem key={task.id.task_id} task={task} />
            ))}
          </List.Section>
          <List.Section title="Completed" subtitle={groupedTasks.completed.length.toString()}>
            {groupedTasks.completed.map((task) => (
              <TaskItem key={task.id.task_id} task={task} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function NewTask() {
  type FormValues = {
    content: string;
    deadline_at: Date | null;
    is_completed: boolean;
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        await createTask({
          content: values.content,
          format: "plaintext",
          deadline_at: values.deadline_at ? values.deadline_at.toISOString() : null,
          is_completed: values.is_completed,
          linked_records: [],
          assignees: [],
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        failToast(toast, error, { title: "Failed" });
      }
    },
    validation: {
      content: (v) => (v?.trim() ? undefined : "Task content is required"),
    },
  });
  return (
    <Form
      navigationTitle={`Tasks / Add`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="New Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" placeholder="Tweet about @Attio" {...itemProps.content} />
      <Form.DatePicker title="Deadline" {...itemProps.deadline_at} />
      <Form.Checkbox label="Completed" {...itemProps.is_completed} />
    </Form>
  );
}
