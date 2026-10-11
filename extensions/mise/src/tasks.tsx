import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import type { MiseLocation } from "./mise/locate";
import { runTask } from "./mise/operations";
import { listTasks, taskGroup, type Task } from "./mise/tasks";
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

  const runAndShow = async (task: Task) => {
    const result = await runOperation(location, runTask(task.name));
    if (result) push(<TaskOutput name={task.name} output={result.stdout + result.stderr} />);
  };

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
            description="Add tasks under [tasks] in ~/.config/mise/config.toml"
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
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
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
