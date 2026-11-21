import {
  Action,
  confirmAlert,
  ActionPanel,
  Color,
  Form,
  Icon,
  open,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  dailyJotName,
  describeNoteSteps,
  NoteStep,
  isInTaskDomain,
  matchNoteByName,
  Note,
  noteAppUrl,
  noteTitle,
  shorten,
} from "../lib/api";
import { cmd } from "../lib/shortcuts";
import { amplenote, isDailyJot } from "../lib/amplenote";
import { buildRepeat, firstOccurrence, HideRule, hideUntilFor, RepeatPreset } from "../lib/repeat";
import { AmplenoteTimeoutError } from "../lib/mcp";

const DAILY_JOT = "daily-jot";
const NO_DOMAIN = "none";
const NONE = "none";

type Values = {
  content: string;
  noteUUID: string;
  startAt: Date | null;
  taskDomain?: string;
};

/** The first occurrence, repeat rule, and hide-until for the form's choices. */
function taskSchedule(start: Date | null, repeat: RepeatPreset | typeof NONE, hideRule: HideRule | typeof NONE) {
  if (!start) return { startAt: null, repeat: null, hideUntil: null };
  // A date picked without a time starts at 9:00, like everywhere else, instead of at midnight.
  const timed = Form.DatePicker.isFullDay(start) ? new Date(new Date(start).setHours(9, 0, 0, 0)) : start;
  const first = repeat === NONE ? timed : firstOccurrence(timed, buildRepeat(timed, repeat));
  return {
    startAt: Math.floor(first.getTime() / 1000),
    repeat: repeat === NONE ? null : buildRepeat(first, repeat),
    hideUntil: repeat === NONE && hideRule !== NONE ? hideUntilFor(first, hideRule) : null,
  };
}

export default function AddTaskForm(props: {
  note?: Note;
  notes?: Note[];
  onCreated?: () => void;
  title?: string;
  targetNoteName?: string;
  closeOnSubmit?: boolean;
}) {
  const { pop } = useNavigation();
  const loadedNotes = usePromise(amplenote.listNotes, [], { execute: !props.notes });
  const notes = props.notes ? { data: props.notes, isLoading: false } : loadedNotes;
  const domains = usePromise(amplenote.getTaskDomains);
  const [contentError, setContentError] = useState<string>();
  const [noteValue, setNoteValue] = useState(props.note?.uuid ?? DAILY_JOT);
  const [targetMissing, setTargetMissing] = useState(false);
  const [important, setImportant] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [repeat, setRepeat] = useState<RepeatPreset | typeof NONE>(NONE);
  const [hideRule, setHideRule] = useState<HideRule | typeof NONE>(NONE);
  const [scheduleError, setScheduleError] = useState<string>();
  const noteTouched = useRef(false);

  useEffect(() => {
    if (!props.targetNoteName || !notes.data || noteTouched.current) return;
    const match = matchNoteByName(
      notes.data.filter((note) => !note.archived),
      props.targetNoteName,
    );
    if (match) setNoteValue(match.uuid);
    else setTargetMissing(true);
  }, [notes.data, props.targetNoteName]);

  const resolveNote = async (value: string): Promise<Note | undefined> => {
    if (value === DAILY_JOT && props.targetNoteName && !noteTouched.current) {
      const candidates = (notes.data ?? (await amplenote.listNotes())).filter((note) => !note.archived);
      const target = matchNoteByName(candidates, props.targetNoteName);
      if (target) return target;
    }
    if (value === DAILY_JOT) return amplenote.findOrCreateDailyJot();
    return [props.note, ...(notes.data ?? [])].find((item) => item?.uuid === value);
  };

  // Set once the task is saved but adding its note to a task domain failed. The form then only retries that.
  const [pending, setPending] = useState<{ noteUUID: string; noteName: string; steps: NoteStep[] }>();
  // One submit at a time: a second ⌘↵ while saving must not add the task twice.
  const busy = useRef(false);
  const maybeAdded = useRef(false);
  const [saving, setSaving] = useState(false);

  const finish = async (noteUUID: string, noteName: string, steps: NoteStep[]) => {
    const failed = await amplenote.applyNoteSteps(noteUUID, steps);
    if (failed.length > 0) {
      setPending({ noteUUID, noteName, steps: failed });
      await showToast({
        style: Toast.Style.Failure,
        title: `Added to ${noteName}, but could not ${describeNoteSteps(failed).replace("add it", "add the note")}`,
        message: "Press ⌘↵ to retry only that step.",
      });
      return;
    }
    setPending(undefined);
    // Refresh again now that the remaining steps (e.g. joining a task domain) are done.
    if (steps.length > 0) props.onCreated?.();
    if (props.closeOnSubmit) {
      // Must be the last step: popping to root ends the command.
      await showHUD(`Added to ${noteName}`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Added to ${noteName}`,
      primaryAction: { title: "Open Note", onAction: () => void open(noteAppUrl(noteUUID)) },
    });
    pop();
  };

  const save = async (values: Values) => {
    if (pending) {
      await finish(pending.noteUUID, pending.noteName, pending.steps);
      return;
    }
    const content = values.content.trim();
    if (!content) {
      setContentError("Enter a task");
      return;
    }
    if ((repeat !== NONE || hideRule !== NONE) && !startAt) {
      setScheduleError("Pick a start date first");
      return;
    }
    const schedule = taskSchedule(startAt, repeat, hideRule);
    if (maybeAdded.current) {
      const again = await confirmAlert({
        title: "Add the task again?",
        message: "The last attempt timed out, so Amplenote may have added the task already.",
        primaryAction: { title: "Add Again" },
      });
      if (!again) return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding task…" });
    let note: Note | undefined;
    let noteUUID: string;
    let inserting = false;
    try {
      note = await resolveNote(values.noteUUID);
      noteUUID = note?.uuid ?? values.noteUUID;
      inserting = true;
      await amplenote.insertTask(noteUUID, {
        content,
        startAt: schedule.startAt,
        repeat: schedule.repeat,
        hideUntil: schedule.hideUntil,
        important,
        urgent,
      });
    } catch (error) {
      toast.hide();
      // A timed-out insert may still land in Amplenote, so warn instead of inviting a blind retry.
      // Only a timed-out insert may have added the task; only a successful add clears this.
      const insertTimedOut = inserting && error instanceof AmplenoteTimeoutError;
      if (insertTimedOut) maybeAdded.current = true;
      await showFailureToast(error, {
        title: "Could not add task",
        message: insertTimedOut
          ? "Amplenote didn't respond in time. The task may have been added anyway; check Amplenote before trying again."
          : undefined,
      });
      return;
    }
    maybeAdded.current = false;
    toast.hide();
    // The task exists now: refresh lists right away, even if the task-domain step fails.
    props.onCreated?.();
    const steps: NoteStep[] =
      values.taskDomain && values.taskDomain !== NO_DOMAIN && !isInTaskDomain(domains.data ?? [], noteUUID)
        ? [{ kind: "taskDomain", taskDomainUUID: values.taskDomain }]
        : [];
    await finish(noteUUID, note?.name ?? "note", steps);
  };

  const submit = async (values: Values) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await save(values);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const selectedNote = [props.note, ...(notes.data ?? [])].find((note) => note?.uuid === noteValue);
  const todaysJot = notes.data?.find((note) => isDailyJot(note) && note.name === dailyJotName(new Date()));
  // A new Daily Jot may join a domain through its tag, so only ask once the note exists.
  const checkedNote = noteValue === DAILY_JOT ? todaysJot?.uuid : noteValue;
  const needsDomain = !!domains.data?.length && !!checkedNote && !isInTaskDomain(domains.data, checkedNote);
  const targetTitle = noteValue === DAILY_JOT ? "Daily Jot" : selectedNote?.name || "Note";
  const startOfDay = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    date.setHours(9, 0, 0, 0);
    return date;
  };

  return (
    <Form
      navigationTitle={props.title ?? "Add Task"}
      isLoading={notes.isLoading || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={pending ? "Retry" : `Add to ${shorten(targetTitle, 30)}`}
            icon={pending ? Icon.ArrowClockwise : Icon.Plus}
            onSubmit={submit}
          />
          <ActionPanel.Section title="Task Options">
            <Action
              title={important ? "Unmark Important" : "Mark Important"}
              icon={Icon.Exclamationmark}
              shortcut={cmd("i")}
              onAction={() => setImportant((value) => !value)}
            />
            <Action
              title={urgent ? "Unmark Urgent" : "Mark Urgent"}
              icon={Icon.Alarm}
              shortcut={cmd("u")}
              onAction={() => setUrgent((value) => !value)}
            />
            <Action
              title="Start Today"
              icon={Icon.Calendar}
              shortcut={cmd("t")}
              onAction={() => setStartAt(startOfDay(0))}
            />
            <Action
              title="Start Tomorrow"
              icon={Icon.Calendar}
              shortcut={cmd("t", { shift: true })}
              onAction={() => setStartAt(startOfDay(1))}
            />
            {startAt ? (
              <Action title="Clear Start Date" icon={Icon.XMarkCircle} onAction={() => setStartAt(null)} />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {pending ? (
        <Form.Description
          title="Task Added"
          text={`The task was added to ${pending.noteName}, but the extension could not ${describeNoteSteps(pending.steps).replace("add it", "add the note")}. Press ⌘↵ to retry only that step. Other changes in this form are not applied anymore.`}
        />
      ) : null}
      <Form.TextField
        id="content"
        title="Task"
        placeholder="What needs doing?"
        error={contentError}
        onChange={() => setContentError(undefined)}
        autoFocus
      />
      <Form.Dropdown
        id="noteUUID"
        title="Note"
        value={noteValue}
        onChange={(value) => {
          if (value !== noteValue) noteTouched.current = true;
          setNoteValue(value);
        }}
        info={
          targetMissing
            ? `No note named "${props.targetNoteName}". Check the Target Note in the Quick Task preferences.`
            : undefined
        }
      >
        {props.note ? (
          <Form.Dropdown.Item title={noteTitle(props.note)} value={props.note.uuid} icon={Icon.Document} />
        ) : null}
        <Form.Dropdown.Item
          title="Today's Daily Jot"
          value={DAILY_JOT}
          icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Section title="Notes">
          {(notes.data ?? [])
            .filter((note) => !note.archived && note.uuid !== props.note?.uuid)
            .map((note) => (
              <Form.Dropdown.Item
                key={note.uuid}
                title={noteTitle(note)}
                value={note.uuid}
                keywords={note.tags}
                icon={Icon.Document}
              />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {needsDomain ? (
        <Form.Dropdown
          id="taskDomain"
          title="Task Domain"
          storeValue
          info="This note isn't in a task domain yet, so its tasks won't show in Search Tasks. Pick a domain to add the note to it."
        >
          {domains.data?.map((domain) => (
            <Form.Dropdown.Item key={domain.uuid} title={domain.name} value={domain.uuid} icon={Icon.Layers} />
          ))}
          <Form.Dropdown.Item title="Don't Add" value={NO_DOMAIN} icon={Icon.MinusCircle} />
        </Form.Dropdown>
      ) : null}
      <Form.Separator />
      <Form.DatePicker
        id="startAt"
        title="Start"
        value={startAt}
        onChange={(value) => {
          setStartAt(value);
          setScheduleError(undefined);
        }}
      />
      <Form.Dropdown
        id="repeat"
        title="Repeat"
        value={repeat}
        error={repeat !== NONE ? scheduleError : undefined}
        info="Repeats on a fixed schedule from the start date and time. Repeating after completion can only be set in Amplenote."
        onChange={(value) => {
          setRepeat(value as RepeatPreset | typeof NONE);
          setScheduleError(undefined);
        }}
      >
        <Form.Dropdown.Item title="Doesn't Repeat" value={NONE} icon={Icon.Minus} />
        <Form.Dropdown.Item title="Daily" value="daily" icon={Icon.Repeat} />
        <Form.Dropdown.Item title="Weekdays" value="weekdays" icon={Icon.Repeat} />
        <Form.Dropdown.Item title="Weekly" value="weekly" icon={Icon.Repeat} />
        <Form.Dropdown.Item title="Every 2 Weeks" value="biweekly" icon={Icon.Repeat} />
        <Form.Dropdown.Item title="Monthly" value="monthly" icon={Icon.Repeat} />
        <Form.Dropdown.Item title="Yearly" value="yearly" icon={Icon.Repeat} />
      </Form.Dropdown>
      {repeat === NONE ? (
        <Form.Dropdown
          id="hideUntil"
          title="Hide Until"
          value={hideRule}
          error={hideRule !== NONE ? scheduleError : undefined}
          info="Keeps the task out of your lists until shortly before it starts."
          onChange={(value) => {
            setHideRule(value as HideRule | typeof NONE);
            setScheduleError(undefined);
          }}
        >
          <Form.Dropdown.Item title="Always Show" value={NONE} />
          <Form.Dropdown.Item title="Day Task Is Due" value="day-due" />
          <Form.Dropdown.Item title="1 Day Before" value="1-day" />
          <Form.Dropdown.Item title="2 Days Before" value="2-days" />
          <Form.Dropdown.Item title="3 Days Before" value="3-days" />
          <Form.Dropdown.Item title="1 Week Before" value="1-week" />
          <Form.Dropdown.Item title="1 Month Before" value="1-month" />
        </Form.Dropdown>
      ) : null}
      <Form.Dropdown
        id="priority"
        title="Priority"
        value={`${important ? "important" : ""}${urgent ? "urgent" : ""}` || "none"}
        onChange={(value) => {
          setImportant(value.includes("important"));
          setUrgent(value.includes("urgent"));
        }}
      >
        <Form.Dropdown.Item title="None" value="none" icon={Icon.Circle} />
        <Form.Dropdown.Item
          title="Important"
          value="important"
          icon={{ source: Icon.Exclamationmark, tintColor: Color.Red }}
        />
        <Form.Dropdown.Item title="Urgent" value="urgent" icon={{ source: Icon.Alarm, tintColor: Color.Orange }} />
        <Form.Dropdown.Item
          title="Important & Urgent"
          value="importanturgent"
          icon={{ source: Icon.Bolt, tintColor: Color.Red }}
        />
      </Form.Dropdown>
    </Form>
  );
}
