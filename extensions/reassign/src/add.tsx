import { BlockTiming, resolveBlockTiming, shiftWallMinutes, wallMinutes } from "./lib/block-timing";
import { AiFillForm } from "./components/ai-fill-form";
import type { BlockDraft } from "./lib/ai-draft";
import {
  Action,
  ActionPanel,
  Form,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type ApiResult,
  backlogCaptureText,
  type BatchReceipt,
  type CreateOp,
  getFreeSlots,
  getSchedule,
  nearestSlotsOf,
  type TimeSlot,
  writeEvents,
} from "./lib/api";
import { captureText, captureTextOp, captureToast } from "./lib/capture-text";
import { batchFailure, needsSignIn } from "./lib/envelope";
import { failToast, runMutation } from "./lib/feedback";
import {
  addDaysISO,
  textLimitError,
  addMinutesLocal,
  clockHM,
  clockPart,
  combineDateTime,
  datePart,
  formatRange,
  humanDuration,
  isIsoDate,
  isLocalDateTime,
  localMinutesBetween,
  localToDate,
  parseDuration,
  todayISO,
  toLocalDateTime,
} from "./lib/format";
import { refusalView } from "./components/states";
import { reassignProvider } from "./lib/oauth";
import {
  CALENDAR_DEFAULT,
  CalendarFields,
  CalendarFormValues,
  CalendarWriteFields,
  calendarCreateFields,
  useCalendars,
} from "./components/calendar-fields";
import { ScheduleContext } from "./lib/launch-context";
import { type ParsedCapture, parseCapture } from "./lib/nl-parse";
import { isEventKind, MAX_CAPTURE_TEXT_LENGTH, MAX_DURATION_MINUTES, WEB_BASE, type EventKind } from "./lib/wire";

interface FormValues extends CalendarFormValues {
  name: string;
  start: Date | null;
  end: Date | null;
  duration: string;
  areaId: string;
  activityTypeId: string;
  kind: string;
  notes: string;
}

// Raycast omits a field that does not render (Duration, and the fields under details).
type SubmitValues = Pick<FormValues, "name" | "start" | "end"> & Partial<Omit<FormValues, "name" | "start" | "end">>;

/** The optional block fields, sent only when set (empty means "leave to the server"). */
function optionalFields(values: FormValues): {
  notes?: string;
  areaId?: string;
  activityTypeId?: string;
  kind?: EventKind;
} {
  const out: { notes?: string; areaId?: string; activityTypeId?: string; kind?: EventKind } = {};
  const notes = values.notes.trim();
  if (notes) out.notes = notes;
  if (values.areaId) out.areaId = values.areaId;
  if (values.activityTypeId) out.activityTypeId = values.activityTypeId;
  if (isEventKind(values.kind)) out.kind = values.kind;
  return out;
}

/** The timing inputs, with the native picker's full-day flag for each boundary. */
function timingFieldsOf(values: Pick<FormValues, "start" | "end" | "duration">) {
  return {
    ...values,
    startFullDay: Boolean(values.start && Form.DatePicker.isFullDay(values.start)),
    endFullDay: Boolean(values.end && Form.DatePicker.isFullDay(values.end)),
  };
}

/**
 * Check the name, notes and times of a submit. A failure shows a toast and gives null.
 * The Inbox sends the name as AI text (up to 2000 characters), so it skips the name limit.
 */
async function prepareSubmit(
  values: FormValues,
  opts: { checkName: boolean } = { checkName: true },
): Promise<{ finalName: string; timing: BlockTiming } | null> {
  const finalName = values.name.trim() || "(untitled)";
  const tooLong = textLimitError(opts.checkName ? finalName : "", values.notes);
  if (tooLong) {
    await showToast({ style: Toast.Style.Failure, title: "The text is too long", message: tooLong });
    return null;
  }
  try {
    return { finalName, timing: resolveBlockTiming(timingFieldsOf(values)) };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Check the block times",
      message: error instanceof Error ? error.message : "Choose valid times.",
    });
    return null;
  }
}

/**
 * One capture command. It parses the text and routes: an explicit time schedules
 * the block; a bare idea (no time, no named day) goes to the Inbox. Both actions
 * stay available, so the default is only a default — the user can always pick the
 * other. A named day without a time ("lunch tomorrow") remains an Inbox idea
 * with a planned date. A duration can find concrete times for the user to review.
 */
function Command(props: LaunchProps<{ arguments: Arguments.Add; launchContext?: ScheduleContext }>) {
  const ctx = props.launchContext;
  const argText = props.arguments?.text?.trim() ?? "";
  const initial = argText || (ctx?.name ?? "");
  const { push } = useNavigation();

  // The areas and activity types for the pickers come with the day read.
  const { data: taxonomy, isLoading, revalidate } = useCachedPromise(getSchedule, [todayISO()]);
  // The account clock minus the device clock, known after the first fresh read.
  const clockOffset = useRef<number | undefined>(undefined);
  const accountClock = () => new Date(Date.now() + (clockOffset.current ?? 0));
  const parsed = argText ? parseCapture(argText, accountClock()) : null;
  const areas = taxonomy?.ok ? (taxonomy.data.areas ?? []) : [];
  const activityTypes = taxonomy?.ok ? (taxonomy.data.activityTypes ?? []) : [];
  const { writable: calendars, defaultId: defaultCalendarId } = useCalendars();
  const [name, setName] = useState(ctx?.name ?? (parsed?.name && parsed.name !== "(untitled)" ? parsed.name : initial));
  // The raw text for the AI Inbox capture, and the name it seeded. A changed name wins.
  const captureSeed = useRef({ name: name.trim(), text: ctx?.name ?? argText });

  // U5: nothing seeded the name, so offer the current selection. The Name field
  // shows the first line; the Inbox capture sends every line to the AI.
  useEffect(() => {
    if (argText || ctx?.name) return;
    getSelectedText()
      .then((text) => {
        const lines = captureText(text);
        const first = lines.split("\n")[0];
        if (!first) return;
        captureSeed.current = { name: first, text: lines };
        setName((current) => current || first);
      })
      .catch(() => undefined);
    // Seed once on mount.
  }, []);

  const ctxDate = isIsoDate(ctx?.date) ? ctx.date : undefined;
  const durationDefault = ctx?.durationMinutes
    ? humanDuration(ctx.durationMinutes)
    : parsed?.durationMinutes
      ? humanDuration(parsed.durationMinutes)
      : "";
  const seed = seedTiming(parsed, ctxDate ?? todayISO());
  const [start, setStart] = useState<Date | null>(seed.start);
  const [end, setEnd] = useState<Date | null>(seed.end);
  const [duration, setDuration] = useState(durationDefault);
  const [planningDate, setPlanningDate] = useState<string | undefined>(seed.planningDate);
  const [hasNamedDate, setHasNamedDate] = useState(Boolean(parsed?.dateExplicit || ctxDate));
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState({ areaId: "", activityTypeId: "", kind: "blocking", notes: "" });
  const [calendarValues, setCalendarValues] = useState<CalendarFormValues>({
    calendarId: CALENDAR_DEFAULT,
    mirrorIds: [],
  });
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [aiDestination, setAiDestination] = useState<"inbox" | "schedule" | null>(null);
  const submitting = useRef(false);
  const saved = useRef(false);
  const timingEdited = useRef(false);
  const durationEdited = useRef(false);

  // The first parse uses the device clock. The account timezone can put the capture
  // on another day, so parse again on the account clock, unless the user edited first.
  useEffect(() => {
    if (clockOffset.current !== undefined || isLoading || !taxonomy?.ok || !isLocalDateTime(taxonomy.data.now)) return;
    clockOffset.current = clockOffsetOf(taxonomy.data.now, Date.now());
    if (timingEdited.current) return;
    const now = accountClock();
    const next = seedTiming(argText ? parseCapture(argText, now) : null, ctxDate ?? todayISO(now));
    setStart(next.start);
    setEnd(next.end);
    setPlanningDate(next.planningDate);
  }, [taxonomy, isLoading]);
  const hasStartTime = Boolean(start && !Form.DatePicker.isFullDay(start));
  const hasEndTime = Boolean(end && !Form.DatePicker.isFullDay(end));
  const showDuration = !(hasStartTime && hasEndTime);
  const primaryIsInbox = !hasStartTime && !hasEndTime && (aiDestination === "inbox" || !duration.trim());
  const timingFields = timingFieldsOf({ start, end, duration });
  // A day from the text parse only is not sent: the Inbox AI reads it from the text.
  // A changed name replaces that text, so then the form day is sent.
  const dateChosen = timingEdited.current || Boolean(ctxDate) || name.trim() !== captureSeed.current.name;
  let timingPreview = primaryIsInbox
    ? hasNamedDate && planningDate
      ? dateChosen
        ? `Inbox — planned for ${planningDate}, no time set`
        : "Inbox — Reassign AI reads the day from the text"
      : "Inbox — save now, schedule later"
    : "Add a time or duration";
  let timingError: string | undefined;
  try {
    const timing = resolveBlockTiming(timingFields);
    if (timing.kind === "exact")
      timingPreview = `${todayISO(timing.start)} ${clockHM(timing.start)} → ${todayISO(timing.end)} ${clockHM(timing.end)} · ${humanDuration(timing.minutes)}`;
    else if (!primaryIsInbox && timing.kind === "flexible")
      timingPreview = `Find ${humanDuration(timing.minutes)} on ${timing.date ?? planningDate ?? todayISO(accountClock())}`;
  } catch (error) {
    timingError = error instanceof Error ? error.message : "Check the times.";
  }

  // When a boundary is cleared, keep the last explicit range as the duration.
  function keepRangeAsDuration() {
    if (hasStartTime && hasEndTime && start && end) {
      const minutes = wallMinutes(start, end);
      if (minutes > 0 && minutes <= MAX_DURATION_MINUTES) setDuration(humanDuration(minutes));
    }
  }
  function changeStart(value: Date | null) {
    timingEdited.current = true;
    keepRangeAsDuration();
    setStart(value);
    setPlanningDate(value ? todayISO(value) : undefined);
    setHasNamedDate(Boolean(value));
  }
  function changeEnd(value: Date | null) {
    timingEdited.current = true;
    keepRangeAsDuration();
    setEnd(value);
  }
  function changeDuration(value: string) {
    // A cleared field is not a choice: the 30-minute default must not go to the AI.
    durationEdited.current = Boolean(value.trim());
    setDuration(value);
  }

  function fillDraft(draft: BlockDraft) {
    timingEdited.current = true;
    setName(draft.name);
    setStart(draft.start);
    const minutes = parseDuration(draft.duration)?.minutes;
    setEnd(draft.start && minutes ? shiftWallMinutes(draft.start, minutes) : null);
    setDuration(draft.duration);
    durationEdited.current = Boolean(draft.duration);
    setAiDestination(draft.destination);
    // Keep the originally captured named day when parking in the Inbox (start=null).
    setPlanningDate((current) => (draft.start ? todayISO(draft.start) : current));
    setHasNamedDate((current) => Boolean(draft.start) || current);
    setDetails({ areaId: draft.areaId, activityTypeId: draft.activityTypeId, kind: draft.kind, notes: draft.notes });
    if (draft.calendarId) {
      // Keep the mirrors and the copy style that the user chose. Only the new home cannot be a mirror.
      const home = draft.calendarId;
      setCalendarValues((current) => ({
        ...current,
        calendarId: home,
        mirrorIds: (current.mirrorIds ?? []).filter((id) => id !== home),
      }));
      // The picker keeps its own state, so remount it to show the suggestion.
      setCalendarRevision((n) => n + 1);
    }
    // Keep every AI-suggested field visible for review; preserve calendar choices.
    setShowDetails(true);
  }

  async function onSaved() {
    saved.current = true;
    await popToRoot({ clearSearchBar: true });
  }

  async function submitOnce(values: SubmitValues, action: (values: FormValues) => Promise<void>) {
    if (submitting.current || saved.current) return;
    submitting.current = true;
    try {
      await action({ ...details, ...calendarValues, ...values, duration: values.duration ?? duration });
    } finally {
      submitting.current = false;
    }
  }

  async function handleSchedule(values: FormValues) {
    const prepared = await prepareSubmit(values);
    if (!prepared) return;
    const { finalName, timing } = prepared;
    const extras = optionalFields(values);
    const calendar = calendarCreateFields(values);
    if (timing.kind === "exact") {
      const result = await runMutation("Scheduling…", `Scheduled “${finalName}”`, () =>
        writeEvents([
          createOp(
            finalName,
            { start: toLocalDateTime(timing.start), end: toLocalDateTime(timing.end) },
            {
              ...extras,
              ...calendar,
            },
          ),
        ]),
      );
      if (result.ok) await onSaved();
      return;
    }
    if (timing.kind === "flexible") {
      await runFlexible({
        name: finalName,
        date: timing.date ?? planningDate ?? todayISO(accountClock()),
        minutes: timing.minutes,
        now: accountClock(),
        earliest: parsed?.earliest,
        latest: parsed?.latest,
        fields: { ...extras, ...calendar },
        push,
        onSaved,
      });
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Add a time or duration",
      message: "Choose a start or end time, add a duration to find a slot, or save to Inbox.",
    });
  }

  /**
   * The AI Inbox capture. The server splits the text into items. Each field sent
   * wins over the AI for every item, so send only what the user chose: a timing
   * the user edited (or the launcher set), and a detail that is not the default.
   */
  async function handleInbox(values: FormValues) {
    const prepared = await prepareSubmit(values, { checkName: false });
    if (!prepared) return;
    const { timing } = prepared;
    const nameChanged = values.name.trim() !== captureSeed.current.name;
    const text = captureText(nameChanged ? values.name : captureSeed.current.text || values.name) || "(untitled)";
    // A cut text loses the later ideas, so refuse it and let the user shorten it.
    if (text.length > MAX_CAPTURE_TEXT_LENGTH) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The text is too long",
        message: `The Inbox takes ${MAX_CAPTURE_TEXT_LENGTH} characters or less. This text has ${text.length}. Select less text, or edit the name.`,
      });
      return;
    }
    // A length the user gave: a typed or AI duration, a chosen end time, or the
    // launcher's. A start alone gets the 30-minute default; the AI estimates it instead.
    // A changed name drops the parsed text, so then the parsed end and length are sent.
    const endChosen =
      (timingEdited.current || nameChanged) && Boolean(values.end && !Form.DatePicker.isFullDay(values.end));
    const lengthChosen =
      durationEdited.current ||
      endChosen ||
      Boolean(ctx?.durationMinutes) ||
      (nameChanged && Boolean(parsed?.durationMinutes));
    const durationMinutes = lengthChosen && timing.kind !== "inbox" ? timing.minutes : undefined;
    // Keep a chosen day as the planned date; do not tag with today by default.
    const plannedDate = !(timingEdited.current || ctxDate || nameChanged)
      ? undefined
      : timing.kind === "exact"
        ? todayISO(timing.start)
        : (timing.date ?? (hasNamedDate ? planningDate : undefined));
    const { notes, areaId, activityTypeId, kind } = optionalFields(values);
    const result = await runMutation("Saving…", captureToast, () =>
      backlogCaptureText(
        captureTextOp(text, {
          durationMinutes,
          plannedDate,
          notes,
          areaId,
          activityTypeId,
          // "blocking" is the form default, not a choice. Leave it to the AI.
          kind: kind === "blocking" ? undefined : kind,
        }),
      ),
    );
    if (result.ok) await onSaved();
  }

  // A definitive auth or Pro refusal gates the form, like the other commands.
  // Other errors fall through — the pickers stay empty and the submit toast tells.
  if (taxonomy && !taxonomy.ok) {
    if (needsSignIn(taxonomy.code) || taxonomy.code === "permission") {
      return refusalView(taxonomy, revalidate);
    }
  }

  // Recurrence is out of scope. Route the user to the web.
  if (parsed?.hasRecurrence) {
    return (
      <Form
        navigationTitle="Add Block"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Reassign" url={WEB_BASE} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Repeating blocks"
          text="You can set a repeat rule (“every …”) only on the web. Open Reassign to make this block."
        />
      </Form>
    );
  }

  const scheduleAction = (
    <Action.SubmitForm
      title={!hasStartTime && !hasEndTime && duration.trim() ? "Find a Time" : "Schedule Block"}
      icon={Icon.Calendar}
      onSubmit={(values: SubmitValues) => submitOnce(values, handleSchedule)}
    />
  );
  const inboxAction = (
    <Action.SubmitForm
      title="Save to Inbox"
      icon={Icon.Tray}
      onSubmit={(values: SubmitValues) => submitOnce(values, handleInbox)}
    />
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Block"
      actions={
        <ActionPanel>
          {primaryIsInbox ? (
            <>
              {inboxAction}
              {scheduleAction}
            </>
          ) : (
            <>
              {scheduleAction}
              {inboxAction}
            </>
          )}
          <Action.Push
            title="Fill with AI…"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            target={
              <AiFillForm
                initialText={`${name}${hasNamedDate && planningDate ? ` on ${planningDate}` : ""}${hasStartTime && start ? ` at ${clockHM(start)}` : ""}${hasEndTime && end ? ` until ${todayISO(end)} ${clockHM(end)}` : duration ? ` for ${duration}` : ""}`}
                areas={areas}
                activityTypes={activityTypes}
                calendars={calendars}
                onFill={fillDraft}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Preview" text={timingPreview} />
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.DatePicker
        id="start"
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        value={start}
        max={hasEndTime && end ? new Date(end.getTime() - 60_000) : undefined}
        onChange={changeStart}
        info="For example, tomorrow at 10am. A date without a time stays an Inbox idea, or a day to find a slot."
      />
      <Form.DatePicker
        id="end"
        title="End"
        type={Form.DatePicker.Type.DateTime}
        value={end}
        min={hasStartTime && start ? new Date(start.getTime() + 60_000) : undefined}
        onChange={changeEnd}
        error={timingError}
        info="Optional. Choose an end time to calculate duration, or leave it empty and enter a duration."
      />
      {showDuration && (
        <Form.TextField
          id="duration"
          title="Duration"
          placeholder="90m, 1h30, or 2 hours"
          value={duration}
          onChange={changeDuration}
          info="With one time, calculates the other (30 minutes by default). Without times, lists open slots to pick."
        />
      )}
      <Form.Checkbox
        id="showDetails"
        label="Show area, activity, calendar, and notes"
        value={showDetails}
        onChange={setShowDetails}
      />
      {showDetails && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="areaId"
            title="Area"
            value={details.areaId}
            onChange={(areaId) => setDetails((current) => ({ ...current, areaId }))}
          >
            <Form.Dropdown.Item value="" title="Unassigned" />
            {areas.map((area) => (
              <Form.Dropdown.Item
                key={area.id}
                value={area.id}
                title={area.name}
                icon={{ source: Icon.Dot, tintColor: area.color }}
              />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="activityTypeId"
            title="Activity"
            value={details.activityTypeId}
            onChange={(activityTypeId) => setDetails((current) => ({ ...current, activityTypeId }))}
          >
            <Form.Dropdown.Item value="" title="None" />
            {activityTypes.map((type) => (
              <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="kind"
            title="Type"
            value={details.kind}
            onChange={(kind) => setDetails((current) => ({ ...current, kind }))}
          >
            <Form.Dropdown.Item value="blocking" title="Blocking" />
            <Form.Dropdown.Item value="non_blocking" title="Non-blocking" />
            <Form.Dropdown.Item value="reference" title="Reference" />
          </Form.Dropdown>
          <CalendarFields
            key={calendarRevision}
            writable={calendars}
            defaultId={defaultCalendarId}
            allowDefault
            calendarDefault={calendarValues.calendarId ?? CALENDAR_DEFAULT}
            mirrorDefault={calendarValues.mirrorIds ?? []}
            styleDefault={calendarValues.mirrorStyle}
            onChange={setCalendarValues}
          />
          <Form.TextArea
            id="notes"
            title="Notes"
            placeholder="Optional details for this block"
            value={details.notes}
            onChange={(notes) => setDetails((current) => ({ ...current, notes }))}
          />
        </>
      )}
    </Form>
  );
}

export default withAccessToken(reassignProvider)(Command);

interface FlexibleArgs {
  name: string;
  date: string;
  minutes: number;
  now: Date;
  earliest?: string;
  latest?: string;
  // The optional block fields and the calendar choice, the same as on an exact create.
  fields: ReturnType<typeof optionalFields> & CalendarWriteFields;
  push: (element: ReactNode) => void;
  onSaved: () => Promise<void>;
}

type CreateFields = FlexibleArgs["fields"];

/** The one create op of Add Block, for an exact time and for a picked slot. */
function createOp(name: string, span: { start: string; end: string }, fields: CreateFields): CreateOp {
  return { op: "create", start: span.start, end: span.end, name, ...fields };
}

/**
 * The search window as local datetimes. A parsed window ("morning") keeps its
 * clocks on the day; a latest at or before the earliest is on the next day.
 * A missing bound falls back to the working day (08:00–22:00), the old server
 * default, so a night slot is never offered.
 */
export function planWindow(
  date: string,
  earliest?: string,
  latest?: string,
  now = new Date(),
): { earliest: string; latest: string; nextDay: boolean } {
  const from = earliest ?? "08:00";
  const to = latest ?? "22:00";
  const span = { earliest: `${date}T${from}`, latest: `${to > from ? date : addDaysISO(date, 1)}T${to}` };
  // Today offers no start before now + 5 minutes. When today's window has
  // passed, look at the same window tomorrow.
  const soonest = toLocalDateTime(new Date(now.getTime() + 5 * 60_000));
  if (date !== todayISO(now) || span.earliest >= soonest) return { ...span, nextDay: false };
  if (span.latest > soonest) return { ...span, earliest: soonest, nextDay: false };
  return {
    earliest: addMinutesLocal(span.earliest, 1440),
    latest: addMinutesLocal(span.latest, 1440),
    nextDay: true,
  };
}

/**
 * The account clock minus the device clock. The server `now` has minute
 * precision only, so round to 15 minutes: every timezone offset is a multiple
 * of 15 minutes, and the same timezone then gives exactly 0.
 */
export function clockOffsetOf(accountNow: string, deviceMs: number): number {
  const quarter = 15 * 60_000;
  return Math.round((localToDate(accountNow).getTime() - deviceMs) / quarter) * quarter || 0; // not -0
}

// The picker shows at most this many slots.
const MAX_SLOTS = 5;

/** Read the free slots in the plan window and show the ones that fit the block. */
async function runFlexible(args: FlexibleArgs): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding open slots…" });
  const searchWindow = planWindow(args.date, args.earliest, args.latest, args.now);
  const from = datePart(searchWindow.earliest);
  const to = datePart(searchWindow.latest);
  // The server filters by length on each day, so it drops a gap that midnight
  // splits. Filter on the client for a window that crosses midnight.
  const result = await getFreeSlots(from, to, from === to ? args.minutes : undefined);
  if (!result.ok) {
    failToast(toast, result);
    return;
  }
  const free = (result.data.days ?? []).flatMap((day) => day.freeSlots ?? []);
  const slots = slotStarts(free, searchWindow, args.minutes);
  if (searchWindow.nextDay) {
    toast.style = Toast.Style.Success;
    toast.title = "Showing tomorrow";
    toast.message = "Today's time window has passed.";
  } else await toast.hide();
  args.push(<SlotsList name={args.name} fields={args.fields} initial={slots} onSaved={args.onSaved} />);
}

/**
 * The candidate slots for a block of `minutes` in the free spans. Clip each span
 * to the window and keep a gap that still fits the block. Each gap gives its start
 * first, then the :00 and :30 marks in it. The result is in time order.
 */
export function slotStarts(
  free: { start: string; end: string }[],
  bounds: { earliest: string; latest: string },
  minutes: number,
): TimeSlot[] {
  const gaps = mergeSpans(
    free.map((span) => ({
      start: span.start > bounds.earliest ? span.start : bounds.earliest,
      end: span.end < bounds.latest ? span.end : bounds.latest,
    })),
  ).filter((gap) => (localMinutesBetween(gap.start, gap.end) ?? 0) >= minutes);
  const firsts = gaps.map((gap) => gap.start);
  const marks = gaps.flatMap((gap) => {
    const out: string[] = [];
    const offset = Number(clockPart(gap.start).slice(3)) % 30;
    for (let mark = addMinutesLocal(gap.start, 30 - offset); addMinutesLocal(mark, minutes) <= gap.end;) {
      out.push(mark);
      mark = addMinutesLocal(mark, 30);
    }
    return out;
  });
  // Gap starts take the first places, so the list shows each gap before more
  // marks inside one gap. Then sort the kept starts by time.
  return [...firsts, ...marks]
    .slice(0, MAX_SLOTS)
    .sort()
    .map((start) => ({ start, end: addMinutesLocal(start, minutes) }));
}

/** Sort the spans and join the ones that touch or overlap, such as a gap split at midnight. */
function mergeSpans(spans: { start: string; end: string }[]): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (const span of [...spans].filter((s) => s.start < s.end).sort((a, b) => a.start.localeCompare(b.start))) {
    const last = out[out.length - 1];
    if (last && span.start <= last.end) last.end = span.end > last.end ? span.end : last.end;
    else out.push({ ...span });
  }
  return out;
}

/** The `conflict` refusal of a slot booking with its `nearestSlots`, or undefined for any other result. */
function conflictOf(result: ApiResult<BatchReceipt> | undefined): { nearest?: TimeSlot[] } | undefined {
  if (!result) return undefined;
  if (!result.ok) return result.code === "conflict" ? { nearest: result.nearestSlots } : undefined;
  const row = batchFailure(result.data);
  return row?.error?.code === "conflict" ? { nearest: nearestSlotsOf(row.error) } : undefined;
}

function SlotsList(props: { name: string; fields: CreateFields; initial: TimeSlot[]; onSaved: () => Promise<void> }) {
  const [slots, setSlots] = useState<TimeSlot[]>(props.initial);
  // One booking at a time. A double tap must never create the block twice.
  const booking = useRef(false);
  const saved = useRef(false);

  async function book(slot: TimeSlot): Promise<void> {
    if (booking.current || saved.current) return;
    booking.current = true;
    try {
      let reply: ApiResult<BatchReceipt> | undefined;
      const result = await runMutation("Scheduling…", `Scheduled “${props.name}”`, async () => {
        reply = await writeEvents([createOp(props.name, slot, props.fields)]);
        return reply;
      });
      if (result.ok) {
        saved.current = true;
        await props.onSaved();
        return;
      }
      // Another block took the time: show the near free slots that the server sent.
      // A conflict without slots can be a sync in flight. Keep the choices and
      // the server's error message so the same booking can be retried.
      const conflict = conflictOf(reply);
      if (!conflict?.nearest) return;
      setSlots(conflict.nearest.filter((s, i, all) => all.findIndex((o) => o.start === s.start) === i));
      await showToast({ style: Toast.Style.Failure, title: "That time was taken. Pick another slot." });
    } finally {
      booking.current = false;
    }
  }

  return (
    <List navigationTitle={`Pick a slot for “${props.name}”`}>
      <List.EmptyView
        icon={Icon.Calendar}
        title="No open slots"
        description="Nothing free fits this block. Go back and try another day or a shorter block."
      />
      {slots.map((slot) => (
        <List.Item
          key={slot.start}
          title={formatRange(slot)}
          subtitle={slot.reason}
          accessories={[{ text: datePart(slot.start) }]}
          actions={
            <ActionPanel>
              <Action title="Use This Slot" icon={Icon.Check} onAction={() => book(slot)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** The start, end and planned day that a parsed capture seeds into the form. */
function seedTiming(parsed: ParsedCapture | null, fallbackDate: string) {
  const start = parsed?.start && parsed.date ? combineDateTime(parsed.date, parsed.start) : null;
  const end = start && parsed?.durationMinutes ? initialEnd(start, parsed.durationMinutes) : null;
  return { start, end, planningDate: parsed?.date ?? fallbackDate };
}

/** A DST-invalid inferred end stays editable instead of crashing the form. */
function initialEnd(start: Date, minutes: number): Date | null {
  try {
    return shiftWallMinutes(start, minutes);
  } catch {
    return null;
  }
}
