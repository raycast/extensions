import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { signOut } from "../lib/oauth";
import type { MutatePromise } from "@raycast/utils";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  ApiError,
  ApiResult,
  BatchReceipt,
  eventsBatch,
  undo,
  updateEvent,
  UpdateEventPatch,
  WriteOp,
} from "../lib/api";
import { applyUndoToast, failToast, showApiError } from "../lib/feedback";
import { ActivityType, Area, eventMeeting, ScheduleEvent, ScheduleResponse } from "../lib/schedule-model";
import { WEB_BASE, webDayUrl } from "../lib/wire";
import { EditForm } from "./edit-form";
import { FeedbackForm } from "./feedback-form";
import { MoveForm } from "./move-form";

/** The day-view cache shape. Other views pass their own cache type to the hook. */
export type ScheduleData = ApiResult<ScheduleResponse> | undefined;
export type OptimisticForOps<T> = (ops: WriteOp[]) => ((data: T) => T) | undefined;

interface AgendaMutationOptions<T> {
  revalidate: () => void;
  // When set, the list updates instantly (via `mutate`) and rolls back on error.
  // Without it, the list revalidates after the call.
  optimistic?: { mutate: MutatePromise<T>; forOps: OptimisticForOps<T> };
}

/** List-level mutation + undo state shared by the agenda commands. */
export function useAgendaMutations<T = ScheduleData>(options: AgendaMutationOptions<T>) {
  const { revalidate, optimistic } = options;
  const [lastUndoToken, setLastUndoToken] = useState<string | null>(null);

  async function apply(loading: string, success: string, ops: WriteOp[]): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: loading });
    try {
      let receipt: BatchReceipt;
      if (optimistic) {
        // Show the change now; `rollbackOnError` restores it if the call fails.
        receipt = await optimistic.mutate(callBatch(ops), {
          optimisticUpdate: optimistic.forOps(ops),
          rollbackOnError: true,
          shouldRevalidateAfter: true,
        });
      } else {
        receipt = await callBatch(ops);
        revalidate();
      }
      toast.style = Toast.Style.Success;
      toast.title = success;
      const token = receipt.undoToken ?? null;
      if (token) {
        setLastUndoToken(token);
        applyUndoToast(toast, token);
      }
    } catch (error) {
      if (isApiError(error)) failToast(toast, error);
      else {
        toast.style = Toast.Style.Failure;
        toast.title = "Something went wrong";
      }
      if (!optimistic) revalidate();
    }
  }

  // Edit path (PATCH /events/{id}). It revalidates rather than updating
  // optimistically — an edit is rarer than a reflect / shift, and the changed
  // fields (area, name) do not map to a simple local transform.
  async function applyEdit(loading: string, success: string, id: string, patch: UpdateEventPatch): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: loading });
    const result = await updateEvent(id, patch);
    if (!result.ok) {
      failToast(toast, result);
      return;
    }
    // A 2xx can still carry a rejected row (failed:1). Treat it as a failure.
    if (result.data.failed > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "The change did not apply";
      toast.message = "The server rejected it.";
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = success;
    const token = result.data.undoToken ?? null;
    if (token) {
      setLastUndoToken(token);
      applyUndoToast(toast, token);
    }
    revalidate();
  }

  async function runUndo(): Promise<void> {
    if (!lastUndoToken) return;
    const result = await undo([lastUndoToken]);
    if (!result.ok) await showApiError(result);
    setLastUndoToken(null);
    revalidate();
  }

  return { mutate: apply, applyEdit, lastUndoToken, runUndo };
}

/** Run a 1-op batch, throwing the refusal so `mutate` can roll back. */
async function callBatch(ops: WriteOp[]): Promise<BatchReceipt> {
  const result = await eventsBatch(ops);
  if (!result.ok) throw result;
  // A 2xx with a rejected row (failed:1) must roll back the optimistic update,
  // so throw an ApiError the caller already handles.
  if (result.data.failed > 0) {
    const failure: ApiError = {
      ok: false,
      code: "validation",
      message: "The server rejected the change.",
    };
    throw failure;
  }
  return result.data;
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && (error as ApiError).ok === false;
}

/** The detail-toggle + refresh pair shared by every agenda command's Navigate section. */
export function AgendaNavActions(props: { showingDetail: boolean; onToggleDetail: () => void; onRefresh: () => void }) {
  return (
    <>
      <Action
        title={props.showingDetail ? "Hide Details" : "Show Details"}
        icon={props.showingDetail ? Icon.EyeDisabled : Icon.Eye}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={props.onToggleDetail}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={props.onRefresh}
      />
      <Action
        title="Log out"
        icon={Icon.Logout}
        style={Action.Style.Destructive}
        onAction={async () => {
          const ok = await confirmAlert({
            title: "Log out of Reassign?",
            message: "You will need to sign in again to use the extension.",
            primaryAction: { title: "Log Out", style: Alert.ActionStyle.Destructive },
          });
          if (ok) {
            await signOut();
            props.onRefresh();
          }
        }}
      />
    </>
  );
}

/**
 * The per-event action panel shared by `today` and `upcoming`. `nav` is the
 * command-specific navigation section (day step, detail toggle, refresh).
 */
export function AgendaActions(props: {
  event: ScheduleEvent;
  date: string;
  areas: Area[];
  activityTypes: ActivityType[];
  mutate: (loading: string, success: string, ops: WriteOp[]) => Promise<void>;
  onEdit: (id: string, patch: UpdateEventPatch) => Promise<void>;
  lastUndoToken: string | null;
  runUndo: () => Promise<void>;
  nav: ReactNode;
}) {
  const { event, date, areas, activityTypes, mutate, onEdit, lastUndoToken, runUndo, nav } = props;
  const { push } = useNavigation();
  const editable = !event.readOnly;
  const meeting = eventMeeting(event);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {meeting && (
          <Action
            title={meeting.label ? `Join ${meeting.label}` : "Join Meeting"}
            icon={Icon.Video}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
            onAction={() => open(meeting.url)}
          />
        )}
        <Action title="Open Block in Reassign" icon={Icon.Globe} onAction={() => open(webDayUrl(date, event.id))} />
        {editable && (
          <>
            <Action
              title="Check off Kept"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() =>
                mutate("Marking as kept…", "Marked as kept", [{ op: "reflect", id: event.id, status: "kept" }])
              }
            />
            <Action
              title="Check off Skipped"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() =>
                mutate("Marking as skipped…", "Marked as skipped", [{ op: "reflect", id: event.id, status: "skipped" }])
              }
            />
          </>
        )}
      </ActionPanel.Section>
      {editable && (
        <ActionPanel.Section title="Adjust">
          <Action
            title="Edit Details…"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() =>
              push(
                <EditForm
                  event={event}
                  areas={areas}
                  activityTypes={activityTypes}
                  onSubmit={(patch) => onEdit(event.id, patch)}
                />,
              )
            }
          />
          <Action
            title="Move to Another Time…"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() =>
              push(<MoveForm event={event} onMove={(op) => mutate("Moving…", "Moved the block", [op])} />)
            }
          />
          <Action
            title="Shift 15 Min Later"
            icon={Icon.ChevronDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => mutate("Shifting…", "Shifted 15 min later", [{ op: "shift", id: event.id, byMinutes: 15 }])}
          />
          <Action
            title="Shift 15 Min Earlier"
            icon={Icon.ChevronUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() =>
              mutate("Shifting…", "Shifted 15 min earlier", [{ op: "shift", id: event.id, byMinutes: -15 }])
            }
          />
          <Action
            title="Delete Block"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => mutate("Deleting…", "Deleted the block", [{ op: "delete", id: event.id }])}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action
          title="Schedule a Block…"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
        />
        {lastUndoToken && (
          <Action
            title="Undo Last Change"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd"], key: "z" }}
            onAction={runUndo}
          />
        )}
        <Action.OpenInBrowser title="Open Reassign" url={WEB_BASE} />
        <Action title="Send Feedback" icon={Icon.Envelope} onAction={() => push(<FeedbackForm />)} />
      </ActionPanel.Section>
      {nav}
    </ActionPanel>
  );
}
