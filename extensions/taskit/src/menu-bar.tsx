import {
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { NotSignedInError, taskit } from "./auth";
import { completeTask, listTasks, type Task } from "./tasks";

const VISIBLE = 12;

type MenuState =
  { signedIn: false; tasks: Task[] } | { signedIn: true; tasks: Task[] };

export default function Command() {
  const today = useCachedPromise(loadToday);

  if (!today.isLoading && today.data && !today.data.signedIn) {
    return (
      <MenuBarExtra icon="icon.png" tooltip="Taskit">
        <MenuBarExtra.Item
          title="Sign in to Taskit"
          onAction={() => void openCommand("my-tasks")}
        />
      </MenuBarExtra>
    );
  }

  const tasks = today.data?.tasks ?? [];
  const shown = tasks.slice(0, VISIBLE);

  return (
    <MenuBarExtra
      icon="icon.png"
      isLoading={today.isLoading}
      title={today.data?.signedIn ? String(tasks.length) : undefined}
      tooltip="Taskit Today"
    >
      <MenuBarExtra.Section title="Today">
        {shown.map((task) => (
          <MenuBarExtra.Item
            key={task.id}
            title={task.title}
            icon={Icon.Circle}
            onAction={() => void finish(task, () => today.revalidate())}
          />
        ))}
        {!today.isLoading && tasks.length === 0 ? (
          <MenuBarExtra.Item title="Nothing due today" />
        ) : null}
        {tasks.length > VISIBLE ? (
          <MenuBarExtra.Item
            title={`${tasks.length - VISIBLE} more`}
            onAction={() => void openCommand("my-tasks")}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="My Tasks"
          onAction={() => void openCommand("my-tasks")}
        />
        <MenuBarExtra.Item
          title="Create Task"
          onAction={() => void openCommand("create-task")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function loadToday(): Promise<MenuState> {
  try {
    const api = await taskit();
    const tasks = await listTasks(api, { view: "today" });
    return { signedIn: true, tasks };
  } catch (error) {
    if (error instanceof NotSignedInError)
      return { signedIn: false, tasks: [] };
    throw error;
  }
}

async function finish(task: Task, revalidate: () => void) {
  try {
    const api = await taskit();
    await completeTask(api, task.id);
    revalidate();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't complete task",
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
}

async function openCommand(name: string) {
  await launchCommand({ name, type: LaunchType.UserInitiated });
}
