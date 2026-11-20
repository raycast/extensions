import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  type Image,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import { basename } from "node:path";
import type { MiseLocation } from "./mise/locate";
import { addTask, deleteTask, editTask, runTaggedTasks, runTask } from "./mise/operations";
import {
  canEditTask,
  listTaskHistory,
  listTasks,
  previewAddTask,
  splitCommand,
  TASK_EDITING_SINCE,
  TASK_HISTORY_SINCE,
  taskGroup,
  validateTaskName,
  type Task,
  type TaskRunSummary,
} from "./mise/tasks";
import { atLeast } from "./mise/version";
import { miseCommandLine } from "./terminal/script";
import { LoadError, loadErrorInView } from "./ui/LoadError";
import { MissingMise } from "./ui/MissingMise";
import { runInTerminal } from "./ui/runInTerminal";
import { runOperation } from "./ui/runOperation";
import { useMise } from "./ui/useMise";

const PLACEHOLDER = "Search global tasks";
const UNGROUPED = "Tasks";

export default function Command() {
  const mise = useMise();
  if (mise.status === "loading") return <List isLoading searchBarPlaceholder={PLACEHOLDER} />;
  if (mise.status === "missing") return <MissingMise searched={mise.searched} />;
  return <Tasks location={mise.location} />;
}

function Tasks({ location }: { location: MiseLocation }) {
  const tasks = useCachedPromise(listTasks, [location], loadErrorInView);
  const { push } = useNavigation();
  const editing = atLeast(location.version, TASK_EDITING_SINCE);
  const historySupported = atLeast(location.version, TASK_HISTORY_SINCE);
  // History only adds accessories to the rows, so a failure to load it just leaves them off.
  const history = useCachedPromise(listTaskHistory, [location], {
    execute: historySupported,
    onError: () => undefined,
  });
  const [tagFilter, setTagFilter] = useState("");

  const runAndShow = async (task: Task) => {
    const result = await runOperation(location, runTask(task.name));
    // revalidate runs even when `execute` is false, so older mise would get a call it can't answer.
    if (historySupported) history.revalidate();
    if (result) push(<TaskOutput name={task.name} output={result.stdout + result.stderr} />);
  };

  const confirmDelete = async (task: Task) => {
    const confirmed = await confirmAlert({
      title: `Delete ${task.name}?`,
      message: `Removes it from ${basename(task.source)}`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await runOperation(location, deleteTask(task), tasks.revalidate);
  };

  const taken = (tasks.data ?? []).flatMap((task) => [task.name, ...task.aliases]);
  const createAction = editing && (
    <Action.Push
      title="Create Task"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<TaskForm location={location} taken={taken} onSaved={tasks.revalidate} />}
    />
  );

  const tags = [...new Set((tasks.data ?? []).flatMap((task) => task.tags ?? []))].sort();
  // A stored filter for a tag no task has any more would hide every task.
  const tag = tags.includes(tagFilter) ? tagFilter : "";
  const sections = new Map<string, Task[]>();
  for (const task of tasks.data ?? []) {
    if (tag && !task.tags?.includes(tag)) continue;
    const group = taskGroup(task.name) ?? UNGROUPED;
    sections.set(group, [...(sections.get(group) ?? []), task]);
  }

  return (
    <List
      isLoading={tasks.isLoading}
      searchBarPlaceholder={PLACEHOLDER}
      searchBarAccessory={
        tags.length > 0 ? (
          <List.Dropdown tooltip="Filter by Tag" storeValue onChange={setTagFilter}>
            <List.Dropdown.Item title="All Tags" value="" />
            {tags.map((t) => (
              <List.Dropdown.Item key={t} title={t} value={t} icon={Icon.Tag} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {tasks.error && !tasks.data ? (
        <LoadError error={tasks.error} retry={tasks.revalidate} />
      ) : (
        !tasks.isLoading && (
          <List.EmptyView
            icon={Icon.Terminal}
            title="No global tasks"
            description={
              editing
                ? "Create one, or add tasks under [tasks] in ~/.config/mise/config.toml"
                : "Add tasks under [tasks] in ~/.config/mise/config.toml"
            }
            actions={createAction && <ActionPanel>{createAction}</ActionPanel>}
          />
        )
      )}
      {[...sections].map(([group, items]) => (
        <List.Section key={group} title={group} subtitle={String(items.length)}>
          {items.map((task) => (
            <List.Item
              key={task.name}
              title={task.name}
              subtitle={task.description}
              keywords={[...task.aliases, ...(task.tags ?? [])]}
              accessories={taskAccessories(task, history.data?.[task.name])}
              actions={
                <ActionPanel>
                  <Action
                    title="Run in Terminal"
                    icon={Icon.Terminal}
                    onAction={() => runInTerminal(miseCommandLine(location, runTask(task.name)))}
                  />
                  <Action title="Run and Show Output" icon={Icon.Text} onAction={() => runAndShow(task)} />
                  {task.tags && (
                    <ActionPanel.Submenu title="Run Tagged Tasks in Terminal" icon={Icon.Tag}>
                      {task.tags.map((t) => (
                        <Action
                          key={t}
                          title={t}
                          icon={Icon.Tag}
                          onAction={() => runInTerminal(miseCommandLine(location, runTaggedTasks(t)))}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                  <Action.Open title="Open Task File" target={task.source} />
                  <Action.CopyToClipboard title="Copy Command" content={`mise run ${task.name}`} />
                  {editing && (
                    <ActionPanel.Section>
                      {createAction}
                      {canEditTask(task) && (
                        <>
                          <Action.Push
                            title="Edit Task"
                            icon={Icon.Pencil}
                            shortcut={Keyboard.Shortcut.Common.Edit}
                            target={
                              <TaskForm location={location} task={task} taken={taken} onSaved={tasks.revalidate} />
                            }
                          />
                          <Action
                            title="Delete Task"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            onAction={() => confirmDelete(task)}
                          />
                        </>
                      )}
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function taskAccessories(task: Task, summary: TaskRunSummary | undefined): List.Item.Accessory[] {
  return [
    ...(task.tags ? [{ icon: Icon.Tag, text: task.tags.join(" "), tooltip: "Tags" }] : []),
    ...(summary ? [runAccessory(summary)] : []),
    { tag: basename(task.source) },
  ];
}

// The text is the median of the successful runs, the typical cost of running the task.
function runAccessory(summary: TaskRunSummary): List.Item.Accessory {
  const last = `Last run ${summary.lastStatus} on ${new Date(summary.lastStartedAt).toLocaleString()} after ${formatDuration(summary.lastMs)}`;
  const runs = `${summary.runs} ${summary.runs === 1 ? "run" : "runs"}, ${summary.failures} failed`;
  const median = summary.medianMs === undefined ? "" : `, median ${formatDuration(summary.medianMs)}`;
  return {
    icon: statusIcon(summary.lastStatus),
    text: summary.medianMs === undefined ? undefined : formatDuration(summary.medianMs),
    tooltip: `${last}\n${runs}${median}`,
  };
}

function statusIcon(status: string): Image.ImageLike {
  if (status === "ok" || status === "cached") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (status === "failed") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  return `${minutes}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

type TaskFormValues = { name: string; description: string; run: string };

// Creates a task in the global config, or edits `task` in the file that defines it. The run field
// holds one command line, so a task with several run commands keeps them and the field is left out.
function TaskForm({
  location,
  task,
  taken,
  onSaved,
}: {
  location: MiseLocation;
  task?: Task;
  taken: string[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const runCount = task?.run.length ?? 0;
  const initialRun = task?.run[0] ?? "";
  const editsRun = runCount <= 1;
  const saved = () => {
    onSaved();
    pop();
  };

  const create = async (values: TaskFormValues) => {
    const name = values.name.trim();
    const run = splitCommand(values.run);
    if ("error" in run) return;
    try {
      const preview = await previewAddTask(location, name);
      if (preview.action === "replaced") {
        setValidationError("name", `${basename(preview.path)} already has a task with this name`);
        return;
      }
    } catch (error) {
      await showFailureToast(error, { title: `Creating ${name} failed` });
      return;
    }
    await runOperation(location, addTask(name, { description: values.description.trim(), run: run.words }), saved);
  };

  const edit = async (task: Task, values: TaskFormValues) => {
    const changes: { description?: string; run?: string[] } = {};
    if (values.description.trim() !== task.description) changes.description = values.description.trim();
    if (editsRun && values.run !== initialRun) {
      const run = splitCommand(values.run);
      if ("error" in run) return;
      changes.run = run.words;
    }
    if (changes.description === undefined && changes.run === undefined) pop();
    else await runOperation(location, editTask(task, changes), saved);
  };

  const { handleSubmit, itemProps, setValidationError } = useForm<TaskFormValues>({
    initialValues: { name: "", description: task?.description ?? "", run: initialRun },
    validation: {
      name: (value) => (task ? undefined : validateTaskName(value?.trim() ?? "", taken)),
      // An edit that leaves the run command as it was saves without re-splitting it.
      run: (value) => {
        if (!editsRun || (task && value === initialRun)) return undefined;
        const run = splitCommand(value ?? "");
        return "error" in run ? run.error : undefined;
      },
    },
    onSubmit: (values) => (task ? edit(task, values) : create(values)),
  });

  return (
    <Form
      navigationTitle={task ? `Edit ${task.name}` : "Create Task"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={task ? "Save Task" : "Create Task"}
            icon={task ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {task ? (
        <Form.Description title="Name" text={task.name} />
      ) : (
        <Form.TextField
          title="Name"
          placeholder="notes:sync"
          info="Group tasks with a colon, as in notes:sync"
          {...itemProps.name}
        />
      )}
      <Form.TextField title="Description" placeholder="Sync notes to the backup drive" {...itemProps.description} />
      {editsRun ? (
        <Form.TextField
          title="Run"
          placeholder="brew upgrade"
          info="One command with its arguments. mise quotes each word, so for pipes, && or $VAR use sh -c '…'"
          {...itemProps.run}
        />
      ) : (
        <Form.Description title="Run" text={`${runCount} commands; edit them in ${basename(task?.source ?? "")}`} />
      )}
      {task && <Form.Description title="File" text={task.source} />}
    </Form>
  );
}

function TaskOutput({ name, output }: { name: string; output: string }) {
  return (
    <Detail
      navigationTitle={name}
      markdown={"```\n" + output + "\n```"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={output} />
        </ActionPanel>
      }
    />
  );
}
