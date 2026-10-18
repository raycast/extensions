import {
  Action,
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

const DAILY_JOT = "daily-jot";
const NO_DOMAIN = "none";

type Values = {
  content: string;
  noteUUID: string;
  startAt: Date | null;
  taskDomain?: string;
};

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

  // Set once the task is saved but adding its note to a task domain failed: submitting again retries only that.
  const pending = useRef<{ noteUUID: string; noteName: string; steps: NoteStep[] }>(undefined);

  const finish = async (noteUUID: string, noteName: string, steps: NoteStep[]) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: pending.current ? "Retrying…" : "Saving task…",
    });
    const failed = await amplenote.applyNoteSteps(noteUUID, steps);
    if (failed.length > 0) {
      pending.current = { noteUUID, noteName, steps: failed };
      toast.style = Toast.Style.Failure;
      toast.title = `Added to ${noteName}, but could not ${describeNoteSteps(failed).replace("add it", "add the note")}`;
      toast.message = "Submit again to retry only that step.";
      toast.primaryAction = { title: "Retry", onAction: () => void finish(noteUUID, noteName, failed) };
      return;
    }
    pending.current = undefined;
    if (props.closeOnSubmit) {
      toast.hide();
      // Must be the last step: popping to root ends the command.
      await showHUD(`Added to ${noteName}`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = `Added to ${noteName}`;
    toast.primaryAction = { title: "Open Note", onAction: () => void open(noteAppUrl(noteUUID)) };
    props.onCreated?.();
    pop();
  };

  const submit = async (values: Values) => {
    if (pending.current) {
      await finish(pending.current.noteUUID, pending.current.noteName, pending.current.steps);
      return;
    }
    const content = values.content.trim();
    if (!content) {
      setContentError("Enter a task");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding task…" });
    let note: Note | undefined;
    let noteUUID: string;
    try {
      note = await resolveNote(values.noteUUID);
      noteUUID = note?.uuid ?? values.noteUUID;
      await amplenote.insertTask(noteUUID, {
        content,
        startAt: values.startAt ? Math.floor(values.startAt.getTime() / 1000) : null,
        important,
        urgent,
      });
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could not add task" });
      return;
    }
    toast.hide();
    const steps: NoteStep[] =
      values.taskDomain && values.taskDomain !== NO_DOMAIN && !isInTaskDomain(domains.data ?? [], noteUUID)
        ? [{ kind: "taskDomain", taskDomainUUID: values.taskDomain }]
        : [];
    await finish(noteUUID, note?.name ?? "note", steps);
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
      isLoading={notes.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Add to ${shorten(targetTitle, 30)}`} icon={Icon.Plus} onSubmit={submit} />
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
      <Form.DatePicker id="startAt" title="Start" value={startAt} onChange={setStartAt} />
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
