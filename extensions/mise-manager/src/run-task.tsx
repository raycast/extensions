import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatMiseError, getTaskRunCommand, listTasks, MiseTask } from "./tools/mise";

export default function RunTaskCommand() {
  const { data, isLoading, error, revalidate } = usePromise(listTasks, []);
  const tasks = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks" throttle>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load tasks"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && tasks.length === 0 ? (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No tasks found"
          description="Add tasks to your mise.toml to see them here."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {tasks.map((task) => (
        <TaskItem key={task.name} task={task} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function TaskItem({ task, onRefresh }: { task: MiseTask; onRefresh: () => void }) {
  const runCommand = getTaskRunCommand(task.name);

  return (
    <List.Item
      title={task.name}
      subtitle={task.description}
      icon={Icon.Terminal}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Run Command" content={runCommand} />
          <Action.Paste title="Paste Run Command" content={runCommand} />
          {/* Note: In a real environment, we'd want Action.OpenInTerminal, but it requires a specific target/shell. 
              We can just copy for now or rely on the user having mise in their shell. 
              Actually, Copy is safer. */}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              onRefresh();
            }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Task" text={task.name} icon={Icon.Terminal} />
              <List.Item.Detail.Metadata.Separator />
              {task.description ? (
                <List.Item.Detail.Metadata.Label title="Description" text={task.description} />
              ) : null}
              {task.source ? (
                <List.Item.Detail.Metadata.Label title="Source" text={task.source} icon={Icon.Document} />
              ) : null}
              {task.aliases && task.aliases.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Aliases">
                  {task.aliases.map((alias) => (
                    <List.Item.Detail.Metadata.TagList.Item key={alias} text={alias} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {task.depends && task.depends.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Depends On">
                  {task.depends.map((dep) => (
                    <List.Item.Detail.Metadata.TagList.Item key={dep} text={dep} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
