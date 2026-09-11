import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { useAppData } from "./lib/hooks/useAppData";
import { getTodayName, resolveRaycastColor } from "./lib/schedule-utils";
import { COLOR_OPTIONS, ICON_OPTIONS, getIcon } from "./lib/constants";
import { isValidTime, uuid } from "./lib/utils";

export default function AddEphemeralCourse() {
  const { activeGroup, addCourse, isLoading } = useAppData();
  const { pop } = useNavigation();
  const today = getTodayName();

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState("calendar");

  async function handleSubmit() {
    if (!title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    if (!activeGroup) {
      await showToast({ style: Toast.Style.Failure, title: "No active schedule group" });
      return;
    }

    if (!isValidTime(startTime)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid start time",
        message: "Use HH:MM format (e.g. 09:00).",
      });
      return;
    }
    if (!isValidTime(endTime)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid end time",
        message: "Use HH:MM format (e.g. 10:30).",
      });
      return;
    }
    if (startTime >= endTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid time range",
        message: "End time must be after start time.",
      });
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expiresAt = tomorrow.toISOString().split("T")[0];

    await addCourse(activeGroup.id, {
      title: title.trim(),
      color,
      icon,
      ephemeral: true,
      expiresAt,
      schedules: [
        {
          id: uuid(),
          days: [today],
          startTime,
          endTime,
          room: room.trim(),
          meetingLink: meetingLink.trim() || undefined,
        },
      ],
    });

    await showToast({ style: Toast.Style.Success, title: "Ephemeral course added for today" });
    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Course for Today" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Quick Add"
        text={`Add a temporary course for ${today}. It will disappear after tomorrow.`}
      />

      <Form.Separator />

      <Form.TextField
        id="title"
        title="Course Title"
        placeholder="e.g., Team Meeting"
        value={title}
        onChange={setTitle}
        autoFocus
      />

      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="HH:MM (e.g., 09:00)"
        value={startTime}
        onChange={(value) => {
          const cleaned = value.replace(/[^0-9:]/g, "");
          if (cleaned.length <= 5) setStartTime(cleaned);
        }}
      />

      <Form.TextField
        id="endTime"
        title="End Time"
        placeholder="HH:MM (e.g., 10:30)"
        value={endTime}
        onChange={(value) => {
          const cleaned = value.replace(/[^0-9:]/g, "");
          if (cleaned.length <= 5) setEndTime(cleaned);
        }}
      />

      <Form.TextField
        id="room"
        title="Room / Location"
        placeholder="e.g., Conference Room A"
        value={room}
        onChange={setRoom}
      />

      <Form.TextField
        id="meetingLink"
        title="Meeting Link (Optional)"
        placeholder="https://..."
        value={meetingLink}
        onChange={setMeetingLink}
      />

      <Form.Separator />

      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {COLOR_OPTIONS.map((c) => (
          <Form.Dropdown.Item
            key={c.value}
            value={c.value}
            title={c.label}
            icon={{ source: Icon.Circle, tintColor: resolveRaycastColor(c.value) }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {ICON_OPTIONS.map((i) => (
          <Form.Dropdown.Item
            key={i.value}
            value={i.value}
            title={i.label}
            icon={getIcon(i.value) ?? { source: Icon.Book }}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Preview" text={`${title || "Course"} (${startTime} - ${endTime})`} />

      <Form.Description text={`Color: ${color} | Icon: ${icon}`} />
    </Form>
  );
}
