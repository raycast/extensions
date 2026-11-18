import {
  Action,
  ActionPanel,
  Form,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createLatestLoader } from "./latest-loader";
import { parseRakeTaskLine, runRake, type RakeTask } from "./rake-utils";

async function readTasks() {
  const preferences = getPreferenceValues<Preferences>();
  const tasks: RakeTask[] = [];
  await runRake(["-T"], preferences, (line) => {
    const task = parseRakeTaskLine(line);
    if (task) tasks.push(task);
  });
  return { tasks, preferences };
}

async function runTask(invocation: string, preferences: Preferences) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `rake ${invocation}`,
  });

  try {
    const { stdout, stderr } = await runRake([invocation], preferences);

    toast.style = Toast.Style.Success;
    toast.title = `rake ${invocation}`;
    toast.message = stdout.trim() || stderr.trim() || "Done";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `rake ${invocation} failed`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function TaskForm({ task, preferences }: { task: RakeTask; preferences: Preferences }) {
  async function submit(values: Record<string, string>) {
    const args = task.args.map((name) => values[name] ?? "");
    const invocation = `${task.name}[${args.join(",")}]`;

    await runTask(invocation, preferences);
  }

  return (
    <Form
      navigationTitle={`rake ${task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Rake Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {task.args.map((arg) => (
        <Form.TextField key={arg} id={arg} title={arg} placeholder={arg} />
      ))}
    </Form>
  );
}

export default function Command() {
  const [taskList, setTaskList] = useState<Awaited<ReturnType<typeof readTasks>>>();
  const [isLoading, setIsLoading] = useState(true);
  const [loader] = useState(() =>
    createLatestLoader({
      load: readTasks,
      onStart: () => {
        setTaskList(undefined);
        setIsLoading(true);
      },
      onSuccess: setTaskList,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "rake -T failed",
          message: error instanceof Error ? error.message : String(error),
        });
      },
      onFinish: () => setIsLoading(false),
    }),
  );

  useEffect(() => {
    loader.run();
    return loader.invalidate;
  }, [loader]);
  const hasTasks = (taskList?.tasks.length ?? 0) > 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rake tasks...">
      <List.EmptyView
        title={isLoading ? "Loading Tasks..." : hasTasks ? "No Matching Tasks" : "No Rake Tasks"}
        description={
          isLoading
            ? "Reading tasks from Rake Directory..."
            : hasTasks
              ? "Try another search."
              : "Check Rake Executable and Rake Directory in preferences, then reload tasks."
        }
        actions={
          <ActionPanel>
            <Action title="Reload Tasks" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={loader.run} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {taskList?.tasks.map((task) => (
        <List.Item
          key={`${task.name}[${task.args.join(",")}]`}
          title={task.name}
          subtitle={task.description}
          accessories={task.args.length > 0 ? [{ text: `[${task.args.join(", ")}]` }] : []}
          actions={
            <ActionPanel>
              {task.args.length > 0 ? (
                <Action.Push
                  title="Enter Arguments"
                  target={<TaskForm task={task} preferences={taskList.preferences} />}
                />
              ) : (
                <Action title="Run Rake Task" onAction={() => runTask(task.name, taskList.preferences)} />
              )}

              <Action title="Reload Tasks" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={loader.run} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
