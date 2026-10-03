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
import { parseRakeTaskLine, runRake, type RakeTask } from "./rake-utils";

async function rake(args: string[], onStdoutLine?: (line: string) => void) {
  return runRake(args, getPreferenceValues<Preferences>(), onStdoutLine);
}

async function runTask(invocation: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `rake ${invocation}`,
  });

  try {
    const { stdout, stderr } = await rake([invocation]);

    toast.style = Toast.Style.Success;
    toast.title = `rake ${invocation}`;
    toast.message = stdout.trim() || stderr.trim() || "Done";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `rake ${invocation} failed`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function TaskForm({ task }: { task: RakeTask }) {
  async function submit(values: Record<string, string>) {
    const args = task.args.map((name) => values[name] ?? "");
    const invocation = `${task.name}[${args.join(",")}]`;

    await runTask(invocation);
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
  const [tasks, setTasks] = useState<RakeTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setIsLoading(true);

    try {
      const tasks: RakeTask[] = [];
      await rake(["-T"], (line) => {
        const task = parseRakeTaskLine(line);
        if (task) tasks.push(task);
      });

      setTasks(tasks);
    } catch (error) {
      setTasks([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "rake -T failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rake tasks...">
      <List.EmptyView
        title={isLoading ? "Loading Tasks..." : tasks.length > 0 ? "No Matching Tasks" : "No Rake Tasks"}
        description={
          isLoading
            ? "Reading tasks from Rake Directory..."
            : tasks.length > 0
              ? "Try another search."
              : "Check Rake Executable and Rake Directory in preferences, then reload tasks."
        }
        actions={
          <ActionPanel>
            <Action title="Reload Tasks" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={loadTasks} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {tasks.map((task) => (
        <List.Item
          key={`${task.name}[${task.args.join(",")}]`}
          title={task.name}
          subtitle={task.description}
          accessories={task.args.length > 0 ? [{ text: `[${task.args.join(", ")}]` }] : []}
          actions={
            <ActionPanel>
              {task.args.length > 0 ? (
                <Action.Push title="Enter Arguments" target={<TaskForm task={task} />} />
              ) : (
                <Action title="Run Rake Task" onAction={() => runTask(task.name)} />
              )}

              <Action title="Reload Tasks" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={loadTasks} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
