import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { describeError, leaf, showLeafError } from "../lib/leaf";
import { toDateString } from "../lib/time";
import type { Calendar, LeafEvent } from "../lib/types";
import CreateEventForm from "./create-event-form";
import EditEventForm from "./edit-event-form";

type Props = {
  event: LeafEvent;
  day: Date;
  calendar?: Calendar;
  onChange: () => void;
  showingDetail: boolean;
  onToggleDetail: () => void;
};

/** Everything you can do with an event in the agenda. */
export default function EventActions({ event, day, calendar, onChange, showingDetail, onToggleDetail }: Props) {
  const canEdit = calendar?.canEdit ?? true;

  // Join Meeting: Raycast closes, and the HUD's first character says how it went
  async function join() {
    await closeMainWindow();
    try {
      const { opened } = await leaf().call("meetings.join", { id: event.id });
      await showHUD(
        opened ? `✅ Joining ${event.title || "your meeting"}` : "❌ Windows couldn't open the meeting link",
        { popToRootType: PopToRootType.Immediate },
      );
    } catch (error) {
      await showHUD(`❌ ${describeError(error).title}`, { popToRootType: PopToRootType.Immediate });
    }
  }

  // Open In Leaf Calendar
  async function show(method: "app.showEvent" | "app.showDay") {
    try {
      if (method === "app.showEvent") {
        await leaf().call("app.showEvent", { id: event.id });
      } else {
        await leaf().call("app.showDay", { date: toDateString(day) });
      }

      await closeMainWindow();
    } catch (error) {
      await showLeafError(error);
    }
  }

  // Delete Event (this instance of a repeating one), After Asking
  async function remove() {
    const confirmed = await confirmAlert({
      title: `Delete ${event.title || "this event"}?`,
      message: "Guests get a cancellation. For a repeating event, only this one is deleted.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    // Stays On The Agenda, Which Refreshes Without It
    try {
      await leaf().call("events.delete", { id: event.id });
      await showToast({ style: Toast.Style.Success, title: "Deleted event", message: event.title });
      onChange();
    } catch (error) {
      await showLeafError(error);
    }
  }

  const joinAction = event.meetingLink ? <Action title="Join Meeting" icon={Icon.Video} onAction={join} /> : null;
  const openAction = (
    <Action
      title="Open in Leaf Calendar"
      icon={Icon.AppWindow}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={() => show("app.showEvent")}
    />
  );

  return (
    <ActionPanel title={event.title || "(No title)"}>
      <ActionPanel.Section>
        {joinAction}
        {openAction}
        <Action
          title="Open Day in Leaf Calendar"
          icon={Icon.Calendar}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={() => show("app.showDay")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {canEdit && (
          <Action.Push
            title="Edit Event"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditEventForm event={event} onSaved={onChange} />}
          />
        )}
        <Action.Push
          title="Create Event"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<CreateEventForm initialDay={day} onCreated={onChange} />}
        />
        {canEdit && (
          <Action
            title="Delete Event"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={remove}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {event.meetingLink && (
          <Action.CopyToClipboard
            title="Copy Meeting Link"
            content={event.meetingLink}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        {event.title && (
          <Action.CopyToClipboard
            title="Copy Title"
            content={event.title}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
        <Action
          title={showingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          onAction={onToggleDetail}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onChange}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
