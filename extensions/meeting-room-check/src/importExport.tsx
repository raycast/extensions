import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Room, getStoredRooms, saveRooms } from "./roomStore";

export function ExportAction() {
  async function handleExport() {
    const rooms = (await getStoredRooms()) ?? [];
    if (rooms.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No rooms to export yet",
      });
      return;
    }
    await Clipboard.copy(JSON.stringify(rooms, null, 2));
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${rooms.length} room(s) to clipboard`,
      message:
        "Paste into Slack, email, a note to yourself, or a colleague's Import",
    });
  }

  return (
    <Action
      title="Export Room List"
      icon={Icon.Upload}
      onAction={handleExport}
    />
  );
}

export function ImportRoomsForm({
  onImported,
}: {
  onImported: (rooms: Room[]) => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { json: string }) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(values.json);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "That doesn't look like valid JSON",
      });
      return;
    }

    if (!Array.isArray(parsed)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Expected a list of rooms (JSON array)",
      });
      return;
    }

    const incoming = parsed.filter(
      (item): item is Room =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Room).name === "string" &&
        typeof (item as Room).calendarId === "string",
    );

    if (incoming.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid rooms found in that JSON",
      });
      return;
    }

    // Merge by calendarId rather than replacing outright — imported rooms
    // are added or updated, anything already configured that isn't in the
    // import stays put. Safer default than silently wiping the list.
    const existing = (await getStoredRooms()) ?? [];
    const merged = new Map(existing.map((r) => [r.calendarId, r]));
    for (const room of incoming) {
      merged.set(room.calendarId, {
        ...room,
        id: room.id ?? `import-${room.calendarId}`,
      });
    }

    const updated = Array.from(merged.values());
    await saveRooms(updated);
    await showToast({
      style: Toast.Style.Success,
      title: `Imported ${incoming.length} room(s)`,
    });
    onImported(updated);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste a room list JSON — your own previous export, or one a colleague sent you. New rooms are added, matching ones (same calendar email) are updated — nothing else is removed." />
      <Form.TextArea
        id="json"
        title="Room list JSON"
        placeholder='[{"name": "...", "calendarId": "..."}]'
      />
    </Form>
  );
}
