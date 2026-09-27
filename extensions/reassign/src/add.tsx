import { BlockTiming, resolveBlockTiming, shiftWallMinutes, wallMinutes } from "./lib/block-timing";
import { AiFillForm } from "./components/ai-fill-form";
import type { BlockDraft } from "./lib/ai-draft";
import { Proposal, readOutcome } from "./lib/schedule-outcome";
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
import { randomUUID } from "node:crypto";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type ApiError,
  backlogCapture,
  confirmSchedule,
  getSchedule,
  planSchedule,
  PlanRequest,
  writeEvents,
} from "./lib/api";
import { batchFailure } from "./lib/envelope";
import { applyUndoToast, failToast, runMutation } from "./lib/feedback";
import {
  addDaysISO,
  textLimitError,
  addMinutesLocal,
  clockHM,
  combineDateTime,
  datePart,
  formatRange,
  humanDuration,
  isIsoDate,
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
  hasCalendarChange,
  useCalendars,
} from "./components/calendar-fields";
import { ScheduleContext } from "./lib/launch-context";
import { parseCapture } from "./lib/nl-parse";
import { WEB_BASE } from "./lib/wire";

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

/** The optional block fields, sent only when set (empty means "leave to the server"). */
function optionalFields(values: FormValues): {
  notes?: string;
  areaId?: string;
  activityTypeId?: string;
  kind?: string;
} {
  const out: { notes?: string; areaId?: string; activityTypeId?: string; kind?: string } = {};
  const notes = values.notes.trim();
  if (notes) out.notes = notes;
  if (values.areaId) out.areaId = values.areaId;
  if (values.activityTypeId) out.activityTypeId = values.activityTypeId;
  if (values.kind) out.kind = values.kind;
  return out;
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
  const parsed = argText ? parseCapture(argText) : null;
  const { push } = useNavigation();

  // The areas and activity types for the pickers come with the day read.
  const { data: taxonomy, isLoading, revalidate } = useCachedPromise(getSchedule, [todayISO()]);
  const areas = taxonomy?.ok ? (taxonomy.data.areas ?? []) : [];
  const activityTypes = taxonomy?.ok ? (taxonomy.data.activityTypes ?? []) : [];
  const { writable: calendars, defaultId: defaultCalendarId } = useCalendars();
  const [name, setName] = useState(ctx?.name ?? (parsed?.name && parsed.name !== "(untitled)" ? parsed.name : initial));

  // U5: nothing seeded the name, so offer the current selection.
  useEffect(() => {
    if (argText || ctx?.name) return;
    getSelectedText()
      .then((text) => {
        const first = text.split("\n")[0].trim();
        if (first) setName((current) => current || first);
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
  const initialStart = parsed?.start && parsed.date ? combineDateTime(parsed.date, parsed.start) : null;
  const [start, setStart] = useState<Date | null>(initialStart);
  const [end, setEnd] = useState<Date | null>(
    initialStart && parsed?.durationMinutes ? initialEnd(initialStart, parsed.durationMinutes) : null,
  );
  const [duration, setDuration] = useState(durationDefault);
  const [planningDate, setPlanningDate] = useState<string | undefined>(parsed?.date ?? ctxDate ?? todayISO());
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
  const hasStartTime = Boolean(start && !Form.DatePicker.isFullDay(start));
  const hasEndTime = Boolean(end && !Form.DatePicker.isFullDay(end));
  const showDuration = !(hasStartTime && hasEndTime);
  const primaryIsInbox = !hasStartTime && !hasEndTime && (aiDestination === "inbox" || !duration.trim());
  const timingFields = {
    start,
    end,
    duration,
    startFullDay: Boolean(start && Form.DatePicker.isFullDay(start)),
    endFullDay: Boolean(end && Form.DatePicker.isFullDay(end)),
  };
  let timingPreview = primaryIsInbox
    ? hasNamedDate && planningDate
      ? `Inbox — planned for ${planningDate}, no time set`
      : "Inbox — save now, schedule later"
    : "Add a time or duration";
  let timingError: string | undefined;
  try {
    const timing = resolveBlockTiming(timingFields);
    if (timing.kind === "exact")
      timingPreview = `${todayISO(timing.start)} ${clockHM(timing.start)} → ${todayISO(timing.end)} ${clockHM(timing.end)} · ${humanDuration(timing.minutes)}`;
    else if (!primaryIsInbox && timing.kind === "flexible")
      timingPreview = `Find ${humanDuration(timing.minutes)} on ${timing.date ?? planningDate ?? todayISO()}`;
  } catch (error) {
    timingError = error instanceof Error ? error.message : "Check the times.";
  }

  function changeStart(value: Date | null) {
    if (hasStartTime && hasEndTime && start && end) {
      const minutes = wallMinutes(start, end);
      if (minutes > 0 && minutes <= 1440) setDuration(humanDuration(minutes));
    }
    setStart(value);
    setPlanningDate(value ? todayISO(value) : undefined);
    setHasNamedDate(Boolean(value));
  }
  function changeEnd(value: Date | null) {
    // When a boundary is cleared, keep the last explicit range as the duration.
    if (hasStartTime && hasEndTime && start && end) {
      const minutes = wallMinutes(start, end);
      if (minutes > 0 && minutes <= 1440) setDuration(humanDuration(minutes));
    }
    setEnd(value);
  }

  function fillDraft(draft: BlockDraft) {
    setName(draft.name);
    setStart(draft.start);
    const minutes = parseDuration(draft.duration)?.minutes;
    setEnd(draft.start && minutes ? shiftWallMinutes(draft.start, minutes) : null);
    setDuration(draft.duration);
    setAiDestination(draft.destination);
    // Keep the originally captured named day when parking in the Inbox (start=null).
    setPlanningDate((current) => (draft.start ? todayISO(draft.start) : current));
    setHasNamedDate((current) => Boolean(draft.start) || current);
    setDetails({ areaId: draft.areaId, activityTypeId: draft.activityTypeId, kind: draft.kind, notes: draft.notes });
    if (draft.calendarId) {
      // Keep the mirrors the user chose; only the new home cannot be a mirror.
      const home = draft.calendarId;
      setCalendarValues((current) => ({
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

  async function submitOnce(values: FormValues, action: (values: FormValues) => Promise<void>) {
    if (submitting.current || saved.current) return;
    submitting.current = true;
    try {
      await action({ ...details, ...calendarValues, ...values, duration: values.duration ?? duration });
    } finally {
      submitting.current = false;
    }
  }

  async function handleSchedule(values: FormValues) {
    const finalName = values.name.trim() || "(untitled)";
    const tooLong = textLimitError(finalName, values.notes);
    if (tooLong) {
      await showToast({ style: Toast.Style.Failure, title: "The text is too long", message: tooLong });
      return;
    }
    const extras = optionalFields(values);
    const calendar = calendarCreateFields(values);
    let timing: BlockTiming;
    try {
      timing = resolveBlockTiming({
        ...values,
        startFullDay: Boolean(values.start && Form.DatePicker.isFullDay(values.start)),
        endFullDay: Boolean(values.end && Form.DatePicker.isFullDay(values.end)),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check the block times",
        message: error instanceof Error ? error.message : "Choose valid times.",
      });
      return;
    }
    if (timing.kind === "exact") {
      const result = await runMutation("Scheduling…", `Scheduled “${finalName}”`, () =>
        writeEvents([
          {
            op: "create",
            start: toLocalDateTime(timing.start),
            end: toLocalDateTime(timing.end),
            name: finalName,
            ...extras,
            ...calendar,
          },
        ]),
      );
      if (result.ok) await onSaved();
      return;
    }
    if (timing.kind === "flexible") {
      await runFlexible({
        name: finalName,
        date: timing.date ?? planningDate ?? todayISO(),
        minutes: timing.minutes,
        earliest: aiDestination === null ? parsed?.earliest : undefined,
        latest: aiDestination === null ? parsed?.latest : undefined,
        areaId: extras.areaId,
        activityTypeId: extras.activityTypeId,
        kind: extras.kind,
        notes: extras.notes,
        calendar,
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

  async function handleInbox(values: FormValues) {
    const finalName = values.name.trim() || "(untitled)";
    const tooLong = textLimitError(finalName, values.notes);
    if (tooLong) {
      await showToast({ style: Toast.Style.Failure, title: "The text is too long", message: tooLong });
      return;
    }
    let timing: BlockTiming;
    try {
      timing = resolveBlockTiming({
        ...values,
        startFullDay: Boolean(values.start && Form.DatePicker.isFullDay(values.start)),
        endFullDay: Boolean(values.end && Form.DatePicker.isFullDay(values.end)),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check the block times",
        message: error instanceof Error ? error.message : "Choose valid times.",
      });
      return;
    }
    const durationMinutes = timing.kind === "inbox" ? ctx?.durationMinutes : timing.minutes;
    // Keep a chosen or named day as the planned date; do not tag with today by default.
    const plannedDate =
      timing.kind === "exact" ? todayISO(timing.start) : (timing.date ?? (hasNamedDate ? planningDate : undefined));
    const { notes, areaId, activityTypeId, kind } = optionalFields(values);
    const result = await runMutation("Saving…", `Saved “${finalName}” to Inbox`, () =>
      backlogCapture({
        op: "capture",
        name: finalName,
        durationMinutes,
        plannedDate,
        notes,
        areaId,
        activityTypeId,
        kind,
      }),
    );
    if (result.ok) await onSaved();
  }

  // A definitive auth or Pro refusal gates the form, like the other commands.
  // Other errors fall through — the pickers stay empty and the submit toast tells.
  if (taxonomy && !taxonomy.ok) {
    if (
      taxonomy.code === "signed_out" ||
      taxonomy.code === "unauthenticated" ||
      taxonomy.code === "unauthorized" ||
      taxonomy.code === "permission"
    ) {
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
      onSubmit={(values: FormValues) => submitOnce(values, handleSchedule)}
    />
  );
  const inboxAction = (
    <Action.SubmitForm
      title="Save to Inbox"
      icon={Icon.Tray}
      onSubmit={(values: FormValues) => submitOnce(values, handleInbox)}
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
          onChange={setDuration}
          info="With one time, calculates the other (30 minutes by default). Without times, finds a slot to confirm."
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
  earliest?: string;
  latest?: string;
  areaId?: string;
  activityTypeId?: string;
  kind?: string;
  notes?: string;
  calendar: CalendarWriteFields;
  push: (element: ReactNode) => void;
  onSaved: () => Promise<void>;
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
  // The server refuses a window that ends before now + its 5-minute lead. For
  // today, look at the same window tomorrow, not refuse the request.
  const soonest = toLocalDateTime(new Date(now.getTime() + 5 * 60_000));
  if (date !== todayISO(now) || span.latest > soonest) return { ...span, nextDay: false };
  return {
    earliest: addMinutesLocal(span.earliest, 1440),
    latest: addMinutesLocal(span.latest, 1440),
    nextDay: true,
  };
}

/** Find concrete time proposals for the user to review before committing. */
async function runFlexible(args: FlexibleArgs): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding a slot…" });
  const searchWindow = planWindow(args.date, args.earliest, args.latest);
  const request: PlanRequest = {
    name: args.name,
    durationMinutes: args.minutes,
    earliest: searchWindow.earliest,
    latest: searchWindow.latest,
    areaId: args.areaId,
    activityTypeId: args.activityTypeId,
    kind: args.kind,
    notes: args.notes,
    autoCommitBest: false,
    // The key of this plan: the 503 retry sends it again, and the server
    // replays the first result. The server replays only by this key.
    requestId: randomUUID(),
  };
  const result = await planSchedule([request]);
  if (!result.ok) {
    failToast(toast, result);
    return;
  }

  const outcome = readOutcome(result.data);
  if (outcome.kind === "committed") {
    toast.style = Toast.Style.Success;
    toast.title = `Scheduled “${args.name}”`;
    if (outcome.undoToken) applyUndoToast(toast, outcome.undoToken);
    await applyCalendar(outcome.eventId, args.calendar, toast);
    await args.onSaved();
    return;
  }
  if (outcome.kind === "proposals") {
    if (searchWindow.nextDay) {
      toast.style = Toast.Style.Success;
      toast.title = "Showing tomorrow";
      toast.message = "Today's time window has passed.";
    } else await toast.hide();
    args.push(
      <ProposalsList
        name={args.name}
        onSaved={args.onSaved}
        request={request}
        calendar={args.calendar}
        initial={{
          options: outcome.options,
          commitToken: outcome.commitToken,
          expiresAt: outcome.expiresAt,
        }}
      />,
    );
    return;
  }
  showNoSlot(toast, outcome.error);
}

interface ProposalState {
  options: Proposal[];
  commitToken: string;
  expiresAt?: number; // epoch ms; the proposals are stale past this
}

function ProposalsList(props: {
  name: string;
  request: PlanRequest;
  calendar: CalendarWriteFields;
  initial: ProposalState;
  onSaved: () => Promise<void>;
}) {
  const [state, setState] = useState<ProposalState>(props.initial);
  // One confirm at a time. A double-tap must never send two commits of one token.
  const confirming = useRef(false);

  // Re-run the plan and re-present fresh proposals on the same toast. With
  // autoCommitBest off the server never books; it returns the options.
  async function replan(toast: Toast): Promise<void> {
    const result = await planSchedule([{ ...props.request, requestId: randomUUID(), autoCommitBest: false }]);
    if (!result.ok) {
      failToast(toast, result);
      return;
    }
    const outcome = readOutcome(result.data);
    if (outcome.kind === "committed") {
      toast.style = Toast.Style.Success;
      toast.title = `Scheduled “${props.name}”`;
      if (outcome.undoToken) applyUndoToast(toast, outcome.undoToken);
      await applyCalendar(outcome.eventId, props.calendar, toast);
      await props.onSaved();
      return;
    }
    if (outcome.kind === "proposals") {
      setState({
        options: outcome.options,
        commitToken: outcome.commitToken,
        expiresAt: outcome.expiresAt,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Refreshed the open slots";
      toast.message = "The earlier ones expired.";
      return;
    }
    showNoSlot(toast, outcome.error);
  }

  async function confirm(index: number): Promise<void> {
    if (confirming.current) return;
    confirming.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Confirming…" });
    try {
      // Late confirm: the commit token expired. Silently re-plan and re-present,
      // never a raw "expired" error. The window is server-tunable — trust expiresAt.
      if (state.expiresAt !== undefined && Date.now() >= state.expiresAt) {
        toast.title = "Refreshing slots…";
        await replan(toast);
        return;
      }
      const result = await confirmSchedule([{ token: state.commitToken, choice: index }]);
      const outcome = result.ok ? readOutcome(result.data) : undefined;
      // The server refuses an expired token with `not_found`; re-plan as above.
      const failure = !result.ok ? result : outcome?.kind === "failed" ? outcome.error : undefined;
      if (failure?.code === "not_found") {
        toast.title = "Refreshing slots…";
        await replan(toast);
        return;
      }
      if (outcome?.kind === "committed") {
        toast.style = Toast.Style.Success;
        toast.title = `Scheduled “${props.name}”`;
        if (outcome.undoToken) applyUndoToast(toast, outcome.undoToken);
        await applyCalendar(outcome.eventId, props.calendar, toast);
        await props.onSaved();
        return;
      }
      if (!result.ok) failToast(toast, result);
      else if (outcome?.kind === "failed" && outcome.error) failToast(toast, outcome.error);
      else {
        toast.style = Toast.Style.Failure;
        toast.title = "The slot was not scheduled";
        toast.message = "Refresh the available slots and try again.";
      }
    } finally {
      confirming.current = false;
    }
  }

  return (
    <List navigationTitle={`Pick a slot for “${props.name}”`}>
      {state.options.map((option, index) => (
        <List.Item
          key={index}
          title={option.start && option.end ? formatRange(option) : `Option ${index + 1}`}
          subtitle={option.reason}
          accessories={option.start ? [{ text: datePart(option.start) }] : []}
          actions={
            <ActionPanel>
              <Action title="Use This Slot" icon={Icon.Check} onAction={() => confirm(index)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * The flexible fit has no calendar fields, so a chosen calendar lands in a
 * follow-up `update` op on the new event. The block stays scheduled either way;
 * a failure only changes the toast message.
 */
async function applyCalendar(eventId: string | undefined, calendar: CalendarWriteFields, toast: Toast): Promise<void> {
  if (!hasCalendarChange(calendar)) return;
  if (!eventId) {
    toast.message = "Pick the calendar with Edit Details.";
    return;
  }
  const result = await writeEvents([{ op: "update", id: eventId, ...calendar }]);
  if (!result.ok || batchFailure(result.data)) {
    toast.message = "The calendar did not apply. Pick it with Edit Details.";
  }
}

/** A plan without a slot. A rejected row shows the server's reason instead. */
function showNoSlot(toast: Toast, error?: ApiError): void {
  if (error) return failToast(toast, error);
  toast.style = Toast.Style.Failure;
  toast.title = "No slot found";
  toast.message = "Try a different day or a shorter block.";
}

/** A DST-invalid inferred end stays editable instead of crashing the form. */
function initialEnd(start: Date, minutes: number): Date | null {
  try {
    return shiftWallMinutes(start, minutes);
  } catch {
    return null;
  }
}
