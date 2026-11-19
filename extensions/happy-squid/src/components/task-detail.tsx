import { Action, ActionPanel, Alert, Color, Detail, Icon, confirmAlert } from "@raycast/api";
import { useTasks, useTaskNavigation } from "../task-state";
import { duration, markdownText, sourceName, taskTimes } from "../format";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";
import { CommonActions } from "./common-actions";

export function TaskDetail() {
  const { snapshot, busy, loading, error, perform, now } = useTasks();
  const push = useTaskNavigation();
  if (!snapshot?.task) return null;
  const task = snapshot.task;
  const times = taskTimes(snapshot, now);
  const finish = async (kind: "stop" | "complete") => {
    const title = kind === "complete" ? "Complete" : "Stop";
    const message = task.source
      ? `${kind === "complete" ? "Completing" : "Stopping"} this task will ${kind === "complete" ? "mark it completed" : "leave it uncompleted"} in ${sourceName(task.source)}.`
      : `You have been working on this task for ${duration(times.elapsed)}.`;
    if (
      await confirmAlert({
        title: `${title} your task?`,
        message,
        primaryAction: { title, style: kind === "stop" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default },
      })
    ) {
      await perform({ kind }, snapshot);
    }
  };
  const lock = async () => {
    if (
      await confirmAlert({
        title: "Lock this task?",
        message: `You won’t be able to pause, stop, or make this task easier for ${duration(times.remaining ?? 0)}. The lock cannot be undone.`,
        primaryAction: { title: "Lock" },
      })
    )
      await perform({ kind: "lock" }, snapshot);
  };
  const sourceUrl = task.sourceUrl && /^(https?:\/\/|obsidian:\/\/)/.test(task.sourceUrl) ? task.sourceUrl : null;
  const saved = snapshot.recentTasks.find((row) => row.description === task.description);
  const status = task.paused ? "Paused" : "Running";

  const controls: (Action.Props & { label: string })[] = [];
  if (!busy) {
    if (task.paused || !task.locked)
      controls.push({
        label: task.paused ? "Resume" : "Pause",
        title: task.paused ? "Resume Task" : "Pause Task",
        icon: task.paused ? Icon.Play : Icon.Pause,
        // ⌘P is Raycast's own (Open Search Bar Dropdown), which removes it from
        // any action that asks for it and logs an error on every render.
        shortcut: { modifiers: ["cmd", "shift"], key: "p" },
        onAction: () => perform({ kind: task.paused ? "resume" : "pause" }, snapshot),
      });
    if (!task.locked) {
      controls.push({
        label: "Edit",
        title: "Edit Task",
        icon: Icon.Pencil,
        shortcut: { modifiers: ["cmd"], key: "e" },
        onAction: () =>
          push(
            <TaskForm
              navigationTitle="Happy Squid"
              purpose="edit"
              displayed={snapshot}
              description={task.description}
            />,
          ),
      });
      if (task.openEnded)
        controls.push({
          label: "Complete",
          title: "Complete Task",
          icon: Icon.CheckCircle,
          onAction: () => finish("complete"),
        });
      controls.push({
        label: "Stop",
        title: "Stop Task",
        icon: Icon.Stop,
        style: Action.Style.Destructive,
        onAction: () => finish("stop"),
      });
    }
    if (task.canLock)
      controls.push({
        label: "Lock…",
        title: "Lock Task…",
        icon: Icon.Lock,
        onAction: () =>
          task.openEnded
            ? push(<TaskForm navigationTitle="Happy Squid" purpose="lock" displayed={snapshot} />)
            : lock(),
      });
    if (saved)
      controls.push({
        label: saved.bookmarked ? "Remove Bookmark" : "Bookmark",
        title: saved.bookmarked ? "Remove Bookmark" : "Bookmark Task",
        icon: Icon.Bookmark,
        shortcut: { modifiers: ["cmd"], key: "b" },
        onAction: () =>
          perform({ kind: "bookmark", description: saved.description, bookmarked: !saved.bookmarked }, snapshot),
      });
  }
  const browseTasks = () => push(<TaskList />);

  return (
    <Detail
      isLoading={busy || loading}
      markdown={`# ${markdownText(task.description)}\n\n${status}${times.remaining === null ? "" : ` · ${duration(times.remaining)} remaining`}\n\n${markdownText(task.context)}${error ? `\n\n**${markdownText(error)}**` : ""}`}
      metadata={
        <Detail.Metadata>
          {controls.length > 0 && (
            <>
              <Detail.Metadata.TagList title="Controls">
                {controls.map(({ title, label, icon, onAction, style }) => (
                  <Detail.Metadata.TagList.Item
                    key={title}
                    text={label}
                    icon={icon}
                    color={style === Action.Style.Destructive ? Color.Red : Color.PrimaryText}
                    onAction={onAction}
                  />
                ))}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Separator />
            </>
          )}
          {times.remaining !== null && <Detail.Metadata.Label title="Remaining" text={duration(times.remaining)} />}
          <Detail.Metadata.Label title="Worked" text={duration(times.elapsed)} />
          <Detail.Metadata.Label
            title="Lock"
            text={
              task.locked
                ? task.lockEndsAt
                  ? `Until ${new Date(task.lockEndsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Locked"
                : "Unlocked"
            }
            icon={task.locked ? Icon.Lock : Icon.LockUnlocked}
          />
          {sourceUrl ? (
            <Detail.Metadata.Link title="Source" text={sourceName(task.source)} target={sourceUrl} />
          ) : task.source ? (
            <Detail.Metadata.Label title="Source" text={sourceName(task.source)} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {controls.map(({ label: _label, ...action }) => (
              <Action key={action.title} {...action} />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Bookmarked and Recent Tasks" icon={Icon.List} onAction={browseTasks} />
            {sourceUrl && <Action.OpenInBrowser title={`Open in ${sourceName(task.source)}`} url={sourceUrl} />}
          </ActionPanel.Section>
          <CommonActions />
        </ActionPanel>
      }
    />
  );
}
