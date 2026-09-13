import {
  Action,
  ActionPanel,
  Form,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { formatDay, parseDay } from "../api/dates";
import {
  diff,
  joinComposedText,
  scheduleOf,
  splitComposedText,
  type ScheduleState,
} from "../api/edits";
import {
  addTask,
  listProjects,
  listTags,
  scheduleTask,
  updateTask,
} from "../api/tasks";
import type { RitualTask, When } from "../api/types";
import { resolveCli } from "../preferences";

type CreateProps = {
  mode: "create";
  defaultWhen: "inbox" | "today";
  initialTitle?: string;
  onSaved?: () => void;
};
type EditProps = { mode: "edit"; task: RitualTask; onSaved: () => void };

/// One form for both jobs. Edit diffs against the loaded task and sends only
/// what changed, because `update` treats an omitted option as "leave it alone"
/// and an explicit "none" as "clear it" — sending everything every time would
/// rewrite fields nobody touched.
export function TaskForm(props: CreateProps | EditProps) {
  const { pop } = useNavigation();
  const existing = props.mode === "edit" ? props.task : undefined;

  // The state the task was loaded in — a snapshot, not the live dropdown
  // value. It decides whether the "keep" option is offered at all (only when
  // the task was, in fact, scheduled for some other day) and is submit time's
  // baseline for "did the dropdown actually move".
  const initial: ScheduleState =
    props.mode === "create" ? props.defaultWhen : scheduleOf(props.task);
  // Only set when `initial` is "keep" — the label names the actual date so
  // the dropdown stops lying about a future-scheduled task being "Today".
  const keepLabel =
    props.mode === "edit" && initial === "keep"
      ? `Scheduled ${props.task.scheduled}`
      : null;

  // A quick-capture argument can carry newlines ("buy milk\nthe oat one"), so
  // it is still split into the two fields rather than dropped whole into the
  // title — the fast path's one-string interface has not changed.
  const seed = splitComposedText(
    props.mode === "edit"
      ? joinComposedText(props.task.title, props.task.notes)
      : (props.initialTitle ?? ""),
  );
  const [title, setTitle] = useState(seed.title);
  const [notes, setNotes] = useState(seed.notes);
  /// A title is one line by construction now (`Form.TextField`), so trimming is
  /// all that stands between the field and the store.
  const trimmedTitle = title.trim();
  const [when, setWhen] = useState<ScheduleState>(initial);
  const [deadline, setDeadline] = useState<Date | null>(
    existing?.deadline ? parseDay(existing.deadline) : null,
  );
  const [project, setProject] = useState(existing?.project ?? "");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);

  // A picker that can't load its options shouldn't take down the form — but
  // the user still needs to know it's empty because of a failure, not
  // because there's nothing to pick.
  const { data: projects } = useCachedPromise(
    () => listProjects(resolveCli()),
    [],
    {
      initialData: [],
      onError: (error) => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load projects",
          message: error.message,
        });
      },
    },
  );
  const { data: allTags } = useCachedPromise(() => listTags(resolveCli()), [], {
    initialData: [],
    onError: (error) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load tags",
        message: error.message,
      });
    },
  });

  async function submit() {
    const title = trimmedTitle;
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "A task needs a title",
      });
      return;
    }
    if (props.mode === "create") {
      try {
        const note = await addTask(resolveCli(), {
          title,
          when: when as "inbox" | "today" | "evening",
          notes: notes || undefined,
          deadline: deadline ? formatDay(deadline) : undefined,
          project: project || undefined,
          tags,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Added to Ritual",
          message: note ? `${title} — ${note}` : title,
        });
        props.onSaved?.();
        // The form IS the root view here (`add-task.tsx`'s only `mode:
        // "create"` call site) — there is nothing above it to pop back to.
        // Dismiss the window instead, same as the argument fast path.
        await closeMainWindow();
        await popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't add task",
          message: (error as Error).message,
        });
      }
      return;
    }

    // Edit mode makes up to two independent, sequential writes: `update` for
    // field edits, then `schedule` for a when-change. They can't be merged —
    // scheduling is genuinely a separate CLI command, and `update` has no
    // schedule field — so one can succeed while the other throws. Track each
    // outcome so a failure never tells the user "nothing happened" when part
    // of it did, and so the list behind this form is always reconciled with
    // whatever really landed, not with the stale row it started with.
    const edits = diff(props.task, {
      title,
      notes,
      deadline: deadline ? formatDay(deadline) : null,
      project: project || null,
      tags,
    });
    const hasEdits = Object.keys(edits).length > 0;
    // `when` isn't an `update` field, so a schedule change is sent only when
    // it actually moved. Selecting "keep" is never a move: it only ever
    // equals `initial`, since it's offered exclusively when it already is
    // the task's current state.
    const hasReschedule = when !== initial;
    let editsSaved = false;
    try {
      if (hasEdits) {
        await updateTask(resolveCli(), props.task.id, edits);
        editsSaved = true;
      }
      if (hasReschedule) {
        const cliWhen: When = when === "inbox" ? "none" : when;
        await scheduleTask(resolveCli(), props.task.id, cliWhen);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: title,
      });
      props.onSaved();
      // The form was pushed onto a list here, so popping back to it is
      // correct — unlike create mode, there is somewhere to return to.
      pop();
    } catch (error) {
      // The field edits may have already committed even though this call is
      // failing — reconcile the list with reality instead of leaving it
      // showing the stale row, and stay on the form so the user can retry
      // rather than popping back to a list claimed to disagree with itself.
      props.onSaved();
      const partial = editsSaved && hasReschedule;
      await showToast({
        style: Toast.Style.Failure,
        title: partial ? "Saved, but couldn't reschedule" : "Couldn't save",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.mode === "create" ? "Add Task" : "Save"}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      {/* Two fields, not one composed text area. A single "Task" field whose
          first line was the title and whose remainder was notes worked, and
          told nobody: the label said "Task", and its placeholder — the only
          thing that explained the convention — is shown by Raycast ONLY while
          the field is empty, which in edit mode it never is. So a task's notes
          were editable and invisible at the same time. */}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs doing?"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Anything worth remembering"
        value={notes}
        onChange={setNotes}
      />
      <Form.Dropdown
        id="when"
        title="When"
        value={when}
        onChange={(value) => setWhen(value as ScheduleState)}
      >
        {keepLabel && <Form.Dropdown.Item value="keep" title={keepLabel} />}
        <Form.Dropdown.Item value="inbox" title="Inbox" />
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="evening" title="This Evening" />
        {/* Quick-schedule presets — edit mode only. `addTask`'s draft (create
            mode) only understands inbox/today/evening, and there is no task
            id back from `addTask` to follow up with a `schedule` call, so
            offering these in create mode would mean an option that silently
            does nothing (the exact bug already fixed once in this form). An
            edit always has a real id, so `submit` can send a second
            `scheduleTask` call the same way it already does for "keep". */}
        {props.mode === "edit" && (
          <>
            <Form.Dropdown.Item value="tomorrow" title="Tomorrow" />
            <Form.Dropdown.Item value="weekend" title="This Weekend" />
            <Form.Dropdown.Item value="next-week" title="Next Week" />
            <Form.Dropdown.Item value="next-weekend" title="Next Weekend" />
            <Form.Dropdown.Item value="next-month" title="Next Month" />
          </>
        )}
      </Form.Dropdown>
      <Form.DatePicker
        id="deadline"
        title="Deadline"
        type={Form.DatePicker.Type.Date}
        value={deadline}
        onChange={setDeadline}
      />
      <Form.Dropdown
        id="project"
        title="Project"
        value={project}
        onChange={setProject}
      >
        <Form.Dropdown.Item value="" title="None" />
        {(projects ?? []).map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.title} title={p.title} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags}>
        {(allTags ?? []).map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
