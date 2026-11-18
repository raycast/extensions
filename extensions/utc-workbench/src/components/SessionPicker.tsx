import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { formatRelative } from "../lib/format";
import type { Session, SessionId } from "../types";
import {
  EMPTY_SESSION_STATE,
  SESSIONS_STORAGE_KEY,
  createSession,
  listSessions,
  renameSession,
  setActiveSession,
} from "../lib/sessions";
import { useRequestSessionDelete } from "../lib/use-session-delete";
import { TextInputForm } from "./TextInputForm";

/**
 * List view for managing sessions. Shows all sessions sorted most-recently
 * created first, with the active session marked by icon color.
 *
 * Uses `useCachedState` (backed by Raycast's Cache API) rather than
 * `useLocalStorage` because every hook instance needs to see writes from
 * every other instance. `useCachedState` subscribes to the Cache via
 * `useSyncExternalStore`, so when the parent `UTCWorkbench` or this
 * picker writes, both see the update immediately. `useLocalStorage`
 * holds per-instance `usePromise` state and does NOT propagate —
 * attempting to use it here caused new sessions to show stale events
 * from the previously active session after a pop back to the main view.
 */
export function SessionPicker() {
  const { pop } = useNavigation();
  const [state, setValue] = useCachedState(SESSIONS_STORAGE_KEY, EMPTY_SESSION_STATE);
  const sessions = listSessions(state);

  // Forwards session deletes to the main (always-mounted, always-
  // foregrounded-after-pop) view. Running the delete from inside the
  // picker — even via the two-phase swap pattern — leaves the main
  // view's native List widget in a background state during phase 1,
  // which still produces a ghost row. The request hook pops first,
  // then writes to a shared cache key after a short delay so the
  // work lands on the foregrounded parent. See `use-session-delete.ts`.
  const requestDeleteSession = useRequestSessionDelete();

  // All mutation handlers use the functional form of `setValue` so the
  // base state is read from the Cache's ref rather than from a closure
  // captured when the handler was defined. Without this, a handler
  // invoked from a stale closure (e.g., after the parent component's
  // `mutateEvents` wrote something between picker renders) could
  // overwrite the fresh cache state with a computed-from-stale result,
  // effectively resurrecting deleted sessions.

  async function handleSwitch(id: SessionId) {
    try {
      setValue((current) => setActiveSession(current, id));
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to switch session" });
    }
  }

  async function handleRename(id: SessionId, label: string) {
    const trimmed = label.trim();
    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Session label required",
      });
      return;
    }
    try {
      setValue((current) => renameSession(current, id, trimmed));
      await showToast({ style: Toast.Style.Success, title: "Session renamed" });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to rename session" });
    }
  }

  async function handleDelete(id: SessionId) {
    try {
      // Pops back to the main view and forwards the delete to be
      // executed there in foreground context. We show the success
      // toast immediately — the actual state mutation happens ~50ms
      // later but is visually instant from the user's perspective.
      requestDeleteSession(id, pop);
      await showToast({ style: Toast.Style.Success, title: "Session deleted" });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete session" });
    }
  }

  async function handleCreate(label: string) {
    const trimmed = label.trim();
    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Session label required",
      });
      return;
    }
    try {
      setValue((current) => createSession(current, trimmed));
      await showToast({
        style: Toast.Style.Success,
        title: `Session "${trimmed}" created`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create session" });
    }
  }

  return (
    <List
      navigationTitle="Sessions"
      searchBarPlaceholder="Filter sessions"
      actions={
        <ActionPanel>
          <Action.Push
            title="New Session"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            target={
              <TextInputForm
                title="New Session"
                fieldTitle="Label"
                placeholder="e.g., db-outage 2026-04-05"
                onSubmit={handleCreate}
              />
            }
          />
        </ActionPanel>
      }
    >
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          isActive={session.id === state.activeSessionId}
          onSwitch={handleSwitch}
          onRename={handleRename}
          onDelete={handleDelete}
          onCreate={handleCreate}
        />
      ))}
    </List>
  );
}

type SessionRowProps = {
  readonly session: Session;
  readonly isActive: boolean;
  readonly onSwitch: (id: SessionId) => Promise<void> | void;
  readonly onRename: (id: SessionId, label: string) => Promise<void> | void;
  readonly onDelete: (id: SessionId) => Promise<void> | void;
  readonly onCreate: (label: string) => Promise<void> | void;
};

function SessionRow({ session, isActive, onSwitch, onRename, onDelete, onCreate }: SessionRowProps) {
  const eventCount = session.events.length;
  const createdAtRelative = session.createdAt !== null ? formatRelative(session.createdAt, { coarse: true }) : "new";
  const subtitle = `${eventCount.toString()} event${eventCount === 1 ? "" : "s"}`;

  return (
    <List.Item
      id={session.id}
      icon={{
        source: isActive ? Icon.CircleFilled : Icon.Circle,
        tintColor: isActive ? Color.Green : Color.SecondaryText,
      }}
      title={session.label}
      subtitle={subtitle}
      accessories={[{ text: createdAtRelative }]}
      actions={
        <ActionPanel>
          {isActive ? (
            <Action
              title="Return to Session"
              icon={Icon.ArrowLeft}
              onAction={() => {
                void onSwitch(session.id);
              }}
            />
          ) : (
            <Action
              title="Switch to Session"
              icon={Icon.ArrowRight}
              onAction={() => {
                void onSwitch(session.id);
              }}
            />
          )}
          <Action.Push
            title="Edit Label"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={
              <TextInputForm
                title={`Edit label for "${session.label}"`}
                fieldTitle="Label"
                placeholder="e.g., db-outage 2026-04-05"
                initialValue={session.label}
                onSubmit={(label) => onRename(session.id, label)}
              />
            }
          />
          <Action.Push
            title="New Session"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            target={
              <TextInputForm
                title="New Session"
                fieldTitle="Label"
                placeholder="e.g., db-outage 2026-04-05"
                onSubmit={onCreate}
              />
            }
          />
          <ActionPanel.Section title="Danger">
            <Action
              title="Delete Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "delete" }}
              onAction={() => {
                void (async () => {
                  const confirmed = await confirmAlert({
                    title: `Delete "${session.label}"?`,
                    message: `This permanently deletes ${eventCount.toString()} event${eventCount === 1 ? "" : "s"} in this session.`,
                    primaryAction: {
                      title: "Delete Session",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (confirmed) {
                    await onDelete(session.id);
                  }
                })();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
