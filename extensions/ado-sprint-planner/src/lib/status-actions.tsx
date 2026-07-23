import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { pinToToday, setStatus } from "./storage";
import { statusColor, statusIcon, statusLabel } from "./status";
import { LocalStatus } from "./types";

const ALL_STATUSES: LocalStatus[] = ["not-started", "in-progress", "done"];

/**
 * A "Set Status" dropdown (Raycast submenu) for a work item's local status.
 * Land on a row and press Tab to open it, then pick a status. When
 * `allowMoveToToday` is set, it also offers "Move to Today" — pins the item to
 * the front of the saved plan so it shows up in the Today command right away.
 */
export function StatusSubmenu(props: {
  id: number;
  current: LocalStatus;
  onChange: (map: Map<number, LocalStatus>) => void;
  allowMoveToToday?: boolean;
}) {
  async function set(status: LocalStatus) {
    const map = await setStatus(props.id, status);
    props.onChange(new Map(map));
  }

  async function moveToToday() {
    await pinToToday(props.id);
    await showToast({
      style: Toast.Style.Success,
      title: `#${props.id} moved to Today`,
    });
  }

  return (
    <ActionPanel.Submenu
      title="Set Status"
      icon={{
        source: statusIcon(props.current),
        tintColor: statusColor(props.current),
      }}
      shortcut={{ modifiers: [], key: "tab" }}
    >
      {ALL_STATUSES.map((status) => (
        <Action
          key={status}
          title={statusLabel(status)}
          icon={{
            source:
              status === props.current ? Icon.CheckCircle : statusIcon(status),
            tintColor: statusColor(status),
          }}
          onAction={() => set(status)}
        />
      ))}
      {props.allowMoveToToday && (
        <Action
          title="Move to Today"
          icon={Icon.Calendar}
          onAction={moveToToday}
        />
      )}
    </ActionPanel.Submenu>
  );
}

/**
 * The same "Set Status" dropdown for a quick note (press Tab). Notes carry the
 * same 3-stage local status; picking "Done" removes the note (see
 * setManualTodoStatus). The caller wires the write + any Undo.
 */
export function NoteStatusSubmenu(props: {
  current: LocalStatus;
  onSet: (status: LocalStatus) => void;
}) {
  return (
    <ActionPanel.Submenu
      title="Set Status"
      icon={{
        source: statusIcon(props.current),
        tintColor: statusColor(props.current),
      }}
      shortcut={{ modifiers: [], key: "tab" }}
    >
      {ALL_STATUSES.map((status) => (
        <Action
          key={status}
          title={statusLabel(status)}
          icon={{
            source:
              status === props.current ? Icon.CheckCircle : statusIcon(status),
            tintColor: statusColor(status),
          }}
          onAction={() => props.onSet(status)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
