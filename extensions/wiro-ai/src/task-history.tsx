import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { TASK_HISTORY_URL, TaskResult } from "./components/task-result";
import { taskResults } from "./lib/outputs";
import { credentials } from "./lib/preferences";
import {
  formatCost,
  formatSeconds,
  isFinished,
  isSuccessful,
  listTasks,
  modelPageUrl,
  statusLabel,
  type Task,
} from "./lib/wiro";

const PAGE_SIZE = 30;

function slugOf(task: Task): string {
  return task.modelslugowner && task.modelslugproject ? `${task.modelslugowner}/${task.modelslugproject}` : "model";
}

function promptOf(task: Task): string {
  const parameters = task.parameters ?? {};
  for (const key of ["prompt", "text", "inputText", "lyrics"]) {
    const value = parameters[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function statusIcon(task: Task): { source: Icon; tintColor?: Color } {
  if (!isFinished(task)) return { source: Icon.CircleProgress, tintColor: Color.Blue };
  if (task.status === "task_cancel") return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  return isSuccessful(task)
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.XMarkCircle, tintColor: Color.Red };
}

function createdAt(task: Task): Date | undefined {
  const seconds = Number(task.createtime);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : undefined;
}

function TaskDetail({ task }: { task: Task }) {
  const slug = slugOf(task);
  const prompt = promptOf(task);
  const results = isSuccessful(task) ? taskResults(task) : [];
  const image = results.find((item) => item.kind === "image");
  const text = results.find((item) => item.kind === "text" && item.text);
  const cost = formatCost(task.chargedcost ?? task.totalcost);
  const duration = formatSeconds(task.elapsedseconds);
  const when = createdAt(task);
  const markdown = [
    image ? `![Result](${image.url})` : "",
    text?.text ? text.text.slice(0, 1500) : "",
    prompt
      ? prompt
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Item.Detail
      markdown={markdown || `**${statusLabel(task.status)}**`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="Model" text={slug} target={modelPageUrl(slug)} />
          <List.Item.Detail.Metadata.Label title="Status" text={statusLabel(task.status)} />
          {results.length > 0 && <List.Item.Detail.Metadata.Label title="Outputs" text={String(results.length)} />}
          {cost && <List.Item.Detail.Metadata.Label title="Cost" text={cost} />}
          {duration && <List.Item.Detail.Metadata.Label title="Run Time" text={duration} />}
          {when && <List.Item.Detail.Metadata.Label title="Started" text={when.toLocaleString("en-US")} />}
          <List.Item.Detail.Metadata.Label title="Task ID" text={task.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function TaskHistory() {
  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    () =>
      async ({ page }: { page: number }) => {
        const { tasks, total } = await listTasks(credentials(), { start: page * PAGE_SIZE, limit: PAGE_SIZE });
        return { data: tasks, hasMore: (page + 1) * PAGE_SIZE < total };
      },
    [],
    { keepPreviousData: true },
  );
  const tasks = data ?? [];
  // Read apart from isLoading, so a failed load still shows its reason.
  const loadError: Error | undefined = error;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={tasks.length > 0}
      pagination={pagination}
      searchBarPlaceholder="Filter recent tasks"
    >
      {!isLoading && tasks.length === 0 && loadError && (
        <List.EmptyView icon={Icon.Warning} title="Could not load your tasks" description={loadError.message} />
      )}
      {!isLoading && tasks.length === 0 && !loadError && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No tasks yet"
          description="Tasks you run with this project show up here."
        />
      )}
      {tasks.map((task) => {
        const slug = slugOf(task);
        const prompt = promptOf(task);
        // The start time is in the detail panel; Raycast hides row accessories while it shows.
        return (
          <List.Item
            key={task.id}
            id={task.id}
            icon={statusIcon(task)}
            title={slug}
            subtitle={prompt.replace(/\s+/g, " ").slice(0, 60)}
            keywords={[prompt.slice(0, 200), statusLabel(task.status)]}
            detail={<TaskDetail task={task} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Results"
                  icon={Icon.Eye}
                  target={
                    <TaskResult
                      slug={slug}
                      taskId={task.id}
                      taskToken={task.socketaccesstoken}
                      noun="result"
                      prompt={prompt}
                      initialTask={task}
                    />
                  }
                />
                <Action.OpenInBrowser title="Open Model Page" icon={Icon.Globe} url={modelPageUrl(slug)} />
                <Action.CopyToClipboard
                  title="Copy Task ID"
                  content={task.id}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                {prompt && (
                  <Action.CopyToClipboard
                    title="Copy Prompt"
                    content={prompt}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                )}
                <Action.OpenInBrowser title="Open Task History on Wiro AI" icon={Icon.List} url={TASK_HISTORY_URL} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
