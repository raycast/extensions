import {
  Action,
  ActionPanel,
  Form,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { type ReactNode, useEffect, useState } from "react";
import { backlogCapture, confirmSchedule, createEvent, getSchedule, planSchedule } from "./lib/api";
import { applyUndoToast, failToast, runMutation } from "./lib/feedback";
import {
  addMinutesHM,
  clockHM,
  combineDateTime,
  humanDuration,
  humanHours,
  isIsoDate,
  parseDuration,
  todayISO,
} from "./lib/format";
import { ProRequiredView, SignedOutView } from "./components/states";
import { minutesFromClock } from "./lib/schedule-model";
import { ScheduleContext } from "./lib/launch-context";
import { parseCapture } from "./lib/nl-parse";
import { WEB_BASE } from "./lib/wire";

interface FormValues {
  name: string;
  start: Date | null; // date + time in one field; empty = fit by duration
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
 * other. A named day with no time ("lunch tomorrow") defaults to Schedule so the
 * user picks a time.
 */
export default function Command(
  props: LaunchProps<{ arguments: { text?: string }; launchContext?: ScheduleContext }>,
) {
  const ctx = props.launchContext;
  const argText = props.arguments?.text?.trim() ?? "";
  const initial = argText || (ctx?.name ?? "");
  const parsed = argText ? parseCapture(argText) : null;
  const { push } = useNavigation();

  // The areas and activity types for the pickers. A compact read is enough.
  const {
    data: taxonomy,
    isLoading,
    revalidate,
  } = useCachedPromise((d: string) => getSchedule(d, true), [todayISO()]);
  const areas = taxonomy?.ok ? (taxonomy.data.areas ?? []) : [];
  const activityTypes = taxonomy?.ok ? (taxonomy.data.activityTypes ?? []) : [];
  const [name, setName] = useState(
    ctx?.name ?? (parsed?.name && parsed.name !== "(untitled)" ? parsed.name : initial),
  );

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
  // Pre-fill the Start only when the text gave an exact time. Otherwise leave it
  // empty, so a duration alone fits a slot and the user can pick a time.
  const startDefault =
    parsed?.start && parsed.date ? combineDateTime(parsed.date, parsed.start) : null;

  // A capture with no start and no named day is an Inbox idea by default.
  const primaryIsInbox = Boolean(parsed) && !parsed?.start && !parsed?.dateExplicit && !ctxDate;

  async function handleSchedule(values: FormValues) {
    const finalName = values.name.trim() || "(untitled)";
    const durationText = values.duration.trim();
    const extras = optionalFields(values);

    // A specific start → create at that time for the duration (default 30 min).
    if (values.start) {
      const date = todayISO(values.start);
      const start = clockHM(values.start);
      const minutes = parseDuration(durationText)?.minutes ?? 30;
      const end = addMinutesHM(start, minutes);
      // Flag an overnight block, or the server reads end < start as a bad range.
      const endNextDay = (minutesFromClock(start) ?? 0) + minutes >= 24 * 60;
      await runMutation("Scheduling…", `Scheduled “${finalName}”`, () =>
        createEvent({
          op: "create",
          date,
          start,
          end,
          name: finalName,
          ...(endNextDay ? { endNextDay: true } : {}),
          ...extras,
        }),
      );
      return;
    }

    // No start but a duration → let the server fit a slot on the named day.
    if (durationText) {
      const minutes = parseDuration(durationText)?.minutes;
      if (!minutes) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not read the duration",
          message: "Try 90m, 1h30, or 2h.",
        });
        return;
      }
      await runFlexible({
        name: finalName,
        date: parsed?.date ?? todayISO(),
        minutes,
        earliest: parsed?.earliest,
        latest: parsed?.latest,
        areaId: extras.areaId,
        activityTypeId: extras.activityTypeId,
        kind: extras.kind,
        notes: extras.notes,
        push,
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "No time found",
      message: "Pick a start, add a duration, or save this to the Inbox.",
    });
  }

  async function handleInbox(values: FormValues) {
    const finalName = values.name.trim() || "(untitled)";
    const minutes = parseDuration(values.duration.trim())?.minutes;
    const durationHours = minutes ? Math.round((minutes / 60) * 100) / 100 : ctx?.durationHours;
    // Keep a chosen or named day as the planned date; do not tag with today by default.
    const plannedDate = values.start
      ? todayISO(values.start)
      : parsed?.dateExplicit
        ? parsed.date
        : ctxDate;
    const { notes, areaId, activityTypeId } = optionalFields(values);
    await runMutation("Saving…", `Saved “${finalName}” to Inbox`, () =>
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
  }

  // A definitive auth or Pro refusal gates the form, like the other commands.
  // Other errors fall through — the pickers stay empty and the submit toast tells.
  if (taxonomy && !taxonomy.ok) {
    if (taxonomy.code === "unauthenticated" || taxonomy.code === "unauthorized") {
      return <SignedOutView onSignedIn={revalidate} />;
    }
    if (taxonomy.code === "permission") return <ProRequiredView />;
  }

  // Recurrence is out of scope. Route the user to the web.
  if (parsed?.hasRecurrence) {
    return (
      <Form
        navigationTitle="Schedule a Block"
        actions={
          <ActionPanel>
            <Action title="Open Reassign" icon={Icon.Globe} onAction={() => open(WEB_BASE)} />
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
    <Action.SubmitForm title="Schedule Block" icon={Icon.Calendar} onSubmit={handleSchedule} />
  );
  const inboxAction = (
    <Action.SubmitForm title="Save to Inbox" icon={Icon.Tray} onSubmit={handleInbox} />
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Schedule a Block"
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
        </ActionPanel>
      }
    >
      {parsed && <Form.Description title="Preview" text={parsed.preview} />}
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.DatePicker
        id="start"
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={startDefault}
      />
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="90m or 1h30 — leave the start empty to fit a slot"
        defaultValue={durationDefault}
      />
      <Form.Separator />
      <Form.Dropdown id="areaId" title="Area" defaultValue="">
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
      <Form.Dropdown id="activityTypeId" title="Activity" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {activityTypes.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="kind" title="Type" defaultValue="blocking">
        <Form.Dropdown.Item value="blocking" title="Blocking" />
        <Form.Dropdown.Item value="non-blocking" title="Non-blocking" />
        <Form.Dropdown.Item value="reference" title="Reference" />
      </Form.Dropdown>
      <Form.TextArea id="notes" title="Notes" placeholder="Optional details for this block" />
    </Form>
  );
}

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
  push: (element: ReactNode) => void;
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

/** Run the flexible fit. Auto-commit a single fit; otherwise pick a proposal. */
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
    autoCommitBest: true,
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
    return;
  }
  if (outcome.kind === "proposals") {
    await toast.hide();
    args.push(
      <ProposalsList
        name={args.name}
        request={request}
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

interface Proposal {
  choice?: number;
  date?: string;
  start?: string;
  end?: string;
  durationMinutes?: number;
  reason?: string;
}

interface ProposalState {
  options: Proposal[];
  commitToken: string;
  expiresAt?: number; // epoch ms; the proposals are stale past this
}

function ProposalsList(props: { name: string; request: PlanRequest; initial: ProposalState }) {
  const { pop } = useNavigation();
  const [state, setState] = useState<ProposalState>(props.initial);

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
      pop();
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
    const toast = await showToast({ style: Toast.Style.Animated, title: "Confirming…" });
    // Late confirm: the commit token expired. Silently re-plan and re-present,
    // never a raw "expired" error. The window is server-tunable — trust expiresAt.
    if (state.expiresAt !== undefined && Date.now() >= state.expiresAt) {
      toast.title = "Refreshing slots…";
      await replan(toast);
      return;
    }
    const result = await confirmSchedule([
      { token: state.commitToken, choice: option.choice ?? index },
    ]);
    if (result.ok) {
      toast.style = Toast.Style.Success;
      toast.title = `Scheduled “${props.name}”`;
      pop();
      return;
    }
    failToast(toast, result);
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
              <Action
                title="Use This Slot"
                icon={Icon.Check}
                onAction={() => confirm(option, index)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type Outcome =
  | { kind: "committed"; undoToken?: string }
  | { kind: "proposals"; options: Proposal[]; commitToken: string; expiresAt?: number }
  | { kind: "failed" };

/** Read the documented BatchOutcome shape (the response type is loose JSON). */
function readOutcome(data: Record<string, unknown>): Outcome {
  const results = Array.isArray(data.results) ? (data.results as Record<string, unknown>[]) : [];
  const first = results[0] ?? {};
  const committed = Array.isArray(data.committed) ? data.committed : [];
  if (first.status === "committed" || committed.length > 0) {
    return { kind: "committed", undoToken: first.undoToken as string | undefined };
  }
  if (first.status === "proposals") {
    return {
      kind: "proposals",
      options: (first.options as Proposal[]) ?? [],
      commitToken: (first.commitToken as string) ?? "",
      expiresAt: proposalDeadline(first),
    };
  }
  return { kind: "failed" };
}

/**
 * Absolute expiry (epoch ms) for a proposal set. Prefer `expiresInMs` (a
 * relative window), else parse `expiresAt`. The server tunes the length, so
 * never assume a fixed 10 min.
 */
function proposalDeadline(first: Record<string, unknown>): number | undefined {
  if (typeof first.expiresInMs === "number") return Date.now() + first.expiresInMs;
  if (typeof first.expiresAt === "string") {
    const parsed = Date.parse(first.expiresAt);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  // A bare number may be epoch seconds or ms. 1e12 ms is year 2001, so any real
  // future ms value is above it while epoch seconds stay below — scale seconds up.
  if (typeof first.expiresAt === "number") {
    return first.expiresAt < 1e12 ? first.expiresAt * 1000 : first.expiresAt;
  }
  return undefined;
}
