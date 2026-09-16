import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Toast,
  confirmAlert,
  open,
  showToast,
} from "@raycast/api";
import {
  completeTask,
  deleteTask,
  scheduleTask,
  uncompleteTask,
  updateTask,
} from "../api/tasks";
import type { RitualProject, RitualTask } from "../api/types";
import { resolveCli } from "../preferences";
import { DateForm } from "./DateForm";
import { TaskForm } from "./TaskForm";

export type Optimistic = (
  apply: (tasks: RitualTask[]) => RitualTask[],
  action: () => Promise<unknown>,
) => Promise<void>;

/// Every verb, defined once. Defining them per command file is how Today came
/// to offer Undo while Search did not.
///
/// `projects` is fetched once by the list (`TaskList`), not per row — a
/// `TaskActions` is instantiated per row, and `useCachedPromise`'s cache only
/// supplies a value for stale-while-revalidate rendering; it does not
/// coalesce in-flight calls, so a fetch here would spawn one `ritual
/// projects` subprocess per row.
export function TaskActions({
  task,
  onChanged,
  optimistic,
  projects,
  showingDetail,
  onToggleDetail,
}: {
  task: RitualTask;
  onChanged: () => void;
  optimistic: Optimistic;
  projects: RitualProject[];
  showingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const without = (id: string) => (tasks: RitualTask[]) =>
    tasks.filter((t) => t.id !== id);

  // The CLI exits 0 for a no-op too, so `changed` is the only thing that
  // distinguishes a real completion from "it was already done" — and
  // offering Undo for the latter would uncomplete something the user never
  // completed in this session. Handling `changed: false` *inside* the
  // optimistic action (rather than throwing) means it resolves normally:
  // `shouldRevalidateAfter` still restores the true state, but it does so
  // without routing through the generic failure toast in `TaskList`'s
  // `optimistic()`, which would show a "Ritual" toast instead of this one.
  async function complete() {
    await optimistic(without(task.id), async () => {
      const result = await completeTask(resolveCli(), task.id);
      if (!result.changed) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Already completed",
          message: task.title,
        });
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Completed",
        message: task.title,
        primaryAction: {
          title: "Undo",
          shortcut: { modifiers: ["cmd"], key: "z" },
          onAction: async (toast) => {
            try {
              await uncompleteTask(resolveCli(), task.id);
              onChanged();
              await toast.hide();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Couldn't undo",
                message: (error as Error).message,
              });
            }
          },
        },
      });
    });
  }

  /// The primary-slot counterpart to `complete` for a row that is already
  /// completed — reachable from Search and the `all` scope, which return
  /// completed tasks. Without this, `↵` on a completed row always ran
  /// `complete` again and always produced a red "Already completed" toast,
  /// and undoing a task completed outside this Raycast session was
  /// impossible.
  async function uncomplete() {
    await optimistic(
      (tasks) =>
        tasks.map((t) => (t.id === task.id ? { ...t, completed: false } : t)),
      async () => {
        const result = await uncompleteTask(resolveCli(), task.id);
        if (!result.changed) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Already not done",
            message: task.title,
          });
          return;
        }
        await showToast({
          style: Toast.Style.Success,
          title: "Marked as not done",
          message: task.title,
        });
      },
    );
  }

  async function reschedule(when: string, label: string) {
    await optimistic(without(task.id), async () => {
      await scheduleTask(resolveCli(), task.id, when);
      await showToast({
        style: Toast.Style.Success,
        title: label,
        message: task.title,
      });
    });
  }

  async function setDeadline(date: string) {
    await optimistic(
      (tasks) =>
        tasks.map((t) => (t.id === task.id ? { ...t, deadline: date } : t)),
      async () => {
        await updateTask(resolveCli(), task.id, { deadline: date });
        await showToast({
          style: Toast.Style.Success,
          title: `Deadline ${date}`,
          message: task.title,
        });
      },
    );
  }

  async function moveToProject(title: string | null) {
    await optimistic(
      (tasks) =>
        tasks.map((t) =>
          t.id === task.id ? { ...t, project: title ?? undefined } : t,
        ),
      async () => {
        await updateTask(resolveCli(), task.id, { project: title });
        await showToast({
          style: Toast.Style.Success,
          title: title ? `Moved to ${title}` : "Removed from project",
          message: task.title,
        });
      },
    );
  }

  // RitualBar (the Mac menubar app) owns the only floating-window surface —
  // Raycast's own window APIs can only reposition OTHER apps' windows, not
  // create one — so this hands off via the `ritualbar://task/<uuid>` URL
  // scheme RitualBar registers, rather than trying to build a window here.
  //
  // `open()` resolves once macOS reports the target opened; it REJECTS when
  // nothing on the system claims the scheme (RitualBar isn't installed, or
  // isn't running and launchd can't find it) — surfaced as a toast naming
  // the likely cause instead of a silent do-nothing tap, which is what a
  // bare fire-and-forget `open()` call would have produced.
  async function openInRitualBar() {
    try {
      await open(`ritualbar://task/${task.id}`);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open in Ritual",
        message: "Is the RitualBar Mac app installed?",
      });
    }
  }

  async function remove() {
    // `delete` writes a soft-delete tombstone that syncs, and there is no
    // undelete — so unlike completion this cannot be an undoable toast.
    const confirmed = await confirmAlert({
      title: "Delete task?",
      message: `"${task.title}" will be deleted everywhere. This can't be undone from Raycast.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await optimistic(without(task.id), async () => {
      await deleteTask(resolveCli(), task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Deleted",
        message: task.title,
      });
    });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* Order IS the shortcut: Raycast binds the first action to ↵ and the
            second to ⌘↵. Don't add a `shortcut` to either — Raycast won't
            display one it assigns to the primary/secondary slots itself.

            ↵ opens the task. The detail panel is always up now, so arrowing
            the list already previews every task; what ↵ owes you is a way
            INTO the one you're on. Raycast's detail pane cannot take focus —
            arrows always drive list selection — so "inside the task" has to
            mean a pushed view, and the editor is the one that lets you act
            rather than just read.

            Completing keeps ⌘↵: it is the destructive-ish move, and a stray
            Enter should open a task, never tick it off. */}
        <Action.Push
          title="Edit Task"
          icon={Icon.Pencil}
          target={<TaskForm mode="edit" task={task} onSaved={onChanged} />}
        />
        {task.completed ? (
          <Action
            title="Mark as Not Done"
            icon={Icon.Undo}
            onAction={uncomplete}
          />
        ) : (
          <Action
            title="Complete"
            icon={Icon.CheckCircle}
            onAction={complete}
          />
        )}
        {/* Kept, but off the primary slot: the panel is on by default and
            most people will leave it, yet it costs list width — a long title
            truncates harder with it up — so the wide-list view stays one
            chord away. */}
        <Action
          title={showingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={onToggleDetail}
        />
        {/* A second way INTO the task, alongside Edit Task above — a floating
            card on top of everything instead of a pushed Raycast view, for
            keeping it visible while working elsewhere. Explicit shortcut
            (not a positional one): it must not shift Complete off ⌘↵. */}
        <Action
          title="Open in Ritual"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={openInRitualBar}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Schedule">
        <Action
          title="Today"
          icon={Icon.Sun}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => reschedule("today", "Scheduled today")}
        />
        <Action
          title="Tomorrow"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={() => reschedule("tomorrow", "Scheduled tomorrow")}
        />
        {/* Ordered the way the app's CalendarSheet chips are: short horizons
            first, then the longer ones, then the escape hatches (Pick Date…,
            Move to Inbox). Tomorrow already exists as a top-level ⌘⇧T action
            below — it's fine for it to appear here too, the app's own sheet
            does the same (Today/Tonight chips alongside a top-level Today
            action). */}
        <ActionPanel.Submenu
          title="Schedule"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        >
          <Action
            title="This Evening"
            icon={Icon.Moon}
            onAction={() => reschedule("evening", "This evening")}
          />
          <Action
            title="Tomorrow"
            icon={Icon.ArrowRight}
            onAction={() => reschedule("tomorrow", "Scheduled tomorrow")}
          />
          <Action
            title="This Weekend"
            icon={Icon.Calendar}
            onAction={() => reschedule("weekend", "Scheduled this weekend")}
          />
          <Action
            title="Next Week"
            icon={Icon.Calendar}
            onAction={() => reschedule("next-week", "Scheduled next week")}
          />
          <Action
            title="Next Weekend"
            icon={Icon.Calendar}
            onAction={() =>
              reschedule("next-weekend", "Scheduled next weekend")
            }
          />
          <Action
            title="Next Month"
            icon={Icon.Calendar}
            onAction={() => reschedule("next-month", "Scheduled next month")}
          />
          <Action.Push
            title="Pick Date…"
            icon={Icon.Calendar}
            target={
              <DateForm
                title="Schedule"
                initial={task.scheduled}
                onPick={(date) => reschedule(date, `Scheduled ${date}`)}
              />
            }
          />
          <Action
            title="Move to Inbox"
            icon={Icon.Tray}
            onAction={() => reschedule("none", "Moved to Inbox")}
          />
        </ActionPanel.Submenu>
        <Action.Push
          title="Set Deadline…"
          icon={Icon.Flag}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          target={
            <DateForm
              title="Deadline"
              initial={task.deadline}
              onPick={setDeadline}
            />
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <ActionPanel.Submenu
          title="Move to Project"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        >
          {projects.map((project) => (
            <Action
              key={project.id}
              title={project.title}
              icon={Icon.Folder}
              onAction={() => moveToProject(project.title)}
            />
          ))}
          <Action
            title="No Project"
            icon={Icon.Minus}
            onAction={() => moveToProject(null)}
          />
        </ActionPanel.Submenu>
        <Action.CopyToClipboard title="Copy Title" content={task.title} />
        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={remove}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
