import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { basename } from "node:path";
import type { MiseLocation } from "./mise/locate";
import { addTask, deleteTask, editTask, runTask } from "./mise/operations";
import {
  canEditTask,
  listTasks,
  previewAddTask,
  splitCommand,
  TASK_EDITING_SINCE,
  taskGroup,
  validateTaskName,
  type Task,
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

  const runAndShow = async (task: Task) => {
    const result = await runOperation(location, runTask(task.name));
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

  const sections = new Map<string, Task[]>();
  for (const task of tasks.data ?? []) {
    const group = taskGroup(task.name) ?? UNGROUPED;
    sections.set(group, [...(sections.get(group) ?? []), task]);
  }

  return (
    <List isLoading={tasks.isLoading} searchBarPlaceholder={PLACEHOLDER}>
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
              keywords={task.aliases}
              accessories={[{ tag: basename(task.source) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Run in Terminal"
                    icon={Icon.Terminal}
                    onAction={() => runInTerminal(miseCommandLine(location, runTask(task.name)))}
                  />
                  <Action title="Run and Show Output" icon={Icon.Text} onAction={() => runAndShow(task)} />
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

type TaskFormValues = { name?: string; description: string; run?: string };
type TaskFormErrors = { name?: string; run?: string };

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
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const runCount = task?.run.length ?? 0;
  const initialRun = task?.run[0] ?? "";
  const saved = () => {
    onSaved();
    pop();
  };

  const create = async (values: TaskFormValues) => {
    const name = values.name?.trim() ?? "";
    const nameError = validateTaskName(name, taken);
    const run = splitCommand(values.run ?? "");
    if (nameError || "error" in run) {
      setErrors({ name: nameError, run: "error" in run ? run.error : undefined });
      return;
    }
    try {
      const preview = await previewAddTask(location, name);
      if (preview.action === "replaced") {
        setErrors({ name: `${basename(preview.path)} already has a task with this name` });
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
    if (values.run !== undefined && values.run !== initialRun) {
      const run = splitCommand(values.run);
      if ("error" in run) {
        setErrors({ run: run.error });
        return;
      }
      changes.run = run.words;
    }
    if (changes.description === undefined && changes.run === undefined) pop();
    else await runOperation(location, editTask(task, changes), saved);
  };

  const clear = (field: keyof TaskFormErrors) => () => {
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  return (
    <Form
      navigationTitle={task ? `Edit ${task.name}` : "Create Task"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={task ? "Save Task" : "Create Task"}
            icon={task ? Icon.Check : Icon.Plus}
            onSubmit={(values: TaskFormValues) => (task ? edit(task, values) : create(values))}
          />
        </ActionPanel>
      }
    >
      {task ? (
        <Form.Description title="Name" text={task.name} />
      ) : (
        <Form.TextField
          id="name"
          title="Name"
          placeholder="notes:sync"
          info="Group tasks with a colon, as in notes:sync"
          error={errors.name}
          onChange={clear("name")}
        />
      )}
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Sync notes to the backup drive"
        defaultValue={task?.description}
      />
      {task && runCount > 1 ? (
        <Form.Description title="Run" text={`${runCount} commands; edit them in ${basename(task.source)}`} />
      ) : (
        <Form.TextField
          id="run"
          title="Run"
          placeholder="brew upgrade"
          info="One command with its arguments. mise quotes each word, so for pipes, && or $VAR use sh -c '…'"
          defaultValue={initialRun}
          error={errors.run}
          onChange={clear("run")}
        />
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
