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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { backlogCapture, confirmSchedule, createEvent, getSchedule, planSchedule, updateEvent } from "./lib/api";
import { applyUndoToast, failToast, runMutation } from "./lib/feedback";
import { clockHM, combineDateTime, humanDuration, humanHours, isIsoDate, parseDuration, todayISO } from "./lib/format";
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

  // The areas and activity types for the pickers. A compact read is enough.
  const { data: taxonomy, isLoading, revalidate } = useCachedPromise((d: string) => getSchedule(d, true), [todayISO()]);
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
  const durationDefault = ctx?.durationHours
    ? humanHours(ctx.durationHours)
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
    setPlanningDate(draft.start ? todayISO(draft.start) : todayISO());
    setHasNamedDate(Boolean(draft.start));
    setDetails({ areaId: draft.areaId, activityTypeId: draft.activityTypeId, kind: draft.kind, notes: draft.notes });
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
      const date = todayISO(timing.start);
      const result = await runMutation("Scheduling…", `Scheduled “${finalName}”`, () =>
        createEvent({
          op: "create",
          date,
          start: clockHM(timing.start),
          end: clockHM(timing.end),
          name: finalName,
          ...(todayISO(timing.end) !== date ? { endNextDay: true } : {}),
          ...extras,
          ...calendar,
        }),
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
    const minutes = timing.kind === "inbox" ? undefined : timing.minutes;
    const durationHours = minutes ? Math.round((minutes / 60) * 100) / 100 : ctx?.durationHours;
    // Keep a chosen or named day as the planned date; do not tag with today by default.
    const plannedDate =
      timing.kind === "exact" ? todayISO(timing.start) : (timing.date ?? (hasNamedDate ? planningDate : undefined));
    const { notes, areaId, activityTypeId } = optionalFields(values);
    const result = await runMutation("Saving…", `Saved “${finalName}” to Inbox`, () =>
      backlogCapture({
        op: "capture",
        name: finalName,
        durationHours,
        plannedDate,
        notes,
        areaId,
        activityTypeId,
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
            <Form.Dropdown.Item value="non-blocking" title="Non-blocking" />
            <Form.Dropdown.Item value="reference" title="Reference" />
          </Form.Dropdown>
          <CalendarFields
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

/** The `/schedule/plan` request. Reused to re-plan when a proposal set expires. */
interface PlanRequest {
  name: string;
  duration: string;
  date: string;
  earliest?: string;
  latest?: string;
  areaId?: string;
  activityTypeId?: string;
  kind?: string;
  notes?: string;
  autoCommitBest: boolean;
}

/** Find concrete time proposals for the user to review before committing. */
async function runFlexible(args: FlexibleArgs): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding a slot…" });
  const request: PlanRequest = {
    name: args.name,
    duration: `${args.minutes}m`,
    date: args.date,
    earliest: args.earliest,
    latest: args.latest,
    areaId: args.areaId,
    activityTypeId: args.activityTypeId,
    kind: args.kind,
    notes: args.notes,
    autoCommitBest: false,
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
    await toast.hide();
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
  toast.style = Toast.Style.Failure;
  toast.title = "No slot found";
  toast.message = "Try a different day or a shorter block.";
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

  // Re-run the plan and re-present fresh proposals on the same toast. Force
  // re-present (autoCommitBest off) so the expired confirm never auto-books a
  // slot the user did not pick.
  async function replan(toast: Toast): Promise<void> {
    const result = await planSchedule([{ ...props.request, autoCommitBest: false }]);
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
    toast.style = Toast.Style.Failure;
    toast.title = "No slot found";
    toast.message = "Try a different day or a shorter block.";
  }

  async function confirm(option: Proposal, index: number): Promise<void> {
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
      const result = await confirmSchedule([{ token: state.commitToken, choice: option.choice ?? index }]);
      const outcome = result.ok ? readOutcome(result.data) : undefined;
      if (outcome?.kind === "committed") {
        toast.style = Toast.Style.Success;
        toast.title = `Scheduled “${props.name}”`;
        if (outcome.undoToken) applyUndoToast(toast, outcome.undoToken);
        await applyCalendar(outcome.eventId, props.calendar, toast);
        await props.onSaved();
        return;
      }
      if (!result.ok) failToast(toast, result);
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
          title={option.start ? `${option.start}–${option.end ?? ""}` : `Option ${index + 1}`}
          subtitle={option.reason}
          accessories={option.date ? [{ text: option.date }] : []}
          actions={
            <ActionPanel>
              <Action title="Use This Slot" icon={Icon.Check} onAction={() => confirm(option, index)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * The flexible fit has no calendar fields, so a chosen calendar lands in a
 * follow-up PATCH on the new event. The block stays scheduled either way; a
 * failure only changes the toast message.
 */
async function applyCalendar(eventId: string | undefined, calendar: CalendarWriteFields, toast: Toast): Promise<void> {
  if (!hasCalendarChange(calendar)) return;
  if (!eventId) {
    toast.message = "Pick the calendar with Edit Details.";
    return;
  }
  const result = await updateEvent(eventId, calendar);
  if (!result.ok || result.data.failed > 0) {
    toast.message = "The calendar did not apply. Pick it with Edit Details.";
  }
}

/** A DST-invalid inferred end stays editable instead of crashing the form. */
function initialEnd(start: Date, minutes: number): Date | null {
  try {
    return shiftWallMinutes(start, minutes);
  } catch {
    return null;
  }
}
