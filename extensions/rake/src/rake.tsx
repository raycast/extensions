import { Action, ActionPanel, Form, Keyboard, List, Toast, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { useEffect, useState } from "react";

const execFileAsync = promisify(execFile);

type RakeTask = {
  name: string;
  args: string[];
  description: string;
};

async function rake(...args: string[]) {
  return execFileAsync("rake", args, {
    cwd: homedir(),
    encoding: "utf8",
  });
}

async function runTask(invocation: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `rake ${invocation}`,
  });

  try {
    const { stdout, stderr } = await rake(invocation);

    toast.style = Toast.Style.Success;
    toast.title = `rake ${invocation}`;
    toast.message = stdout.trim() || stderr.trim() || "Done";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `rake ${invocation} failed`;
    toast.message = String(error);
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
      const { stdout } = await rake("-T");

      const tasks = stdout
        .split("\n")
        .map((line): RakeTask | null => {
          const match = line.match(/^rake\s+([^\s[]+)(?:\[([^\]]*)\])?(?:\s+#\s*(.*))?$/);

          if (!match) {
            return null;
          }

          return {
            name: match[1],
            args: match[2] ? match[2].split(",").map((arg) => arg.trim()) : [],
            description: match[3] ?? "",
          };
        })
        .filter((task): task is RakeTask => task !== null);

      setTasks(tasks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "rake -T failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rake tasks...">
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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
