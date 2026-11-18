import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { Fragment, useState } from "react";
import { Course, ScheduleSlot, DayOfWeek, ScheduleTemplate } from "../types";
import {
  DAYS_OF_WEEK,
  COLOR_OPTIONS,
  ICON_OPTIONS,
  CUSTOM_COLOR_VALUE,
  MAX_SCHEDULE_SLOTS,
  getIcon,
} from "../constants";
import { isValidTime, resolveRaycastColor, parseTime } from "../schedule-utils";
import { detectConflicts } from "../conflict-detection";
import { uuid } from "../utils";

interface CourseFormProps {
  initialValues?: Course;
  onSubmit: (course: Omit<Course, "id">) => void;
  isLoading?: boolean;
  isEphemeral?: boolean;
  existingCourses?: Course[];
  templates?: ScheduleTemplate[];
}

interface ScheduleSlotInput {
  id?: string; // Preserve existing slot ID on edit; undefined for new slots
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
  room: string;
  meetingLink: string;
}

export function CourseForm({
  initialValues,
  onSubmit,
  isLoading,
  isEphemeral: defaultEphemeral = false,
  existingCourses,
  templates,
}: CourseFormProps) {
  const { pop } = useNavigation();
  const [isEphemeral, setIsEphemeral] = useState(initialValues?.ephemeral ?? defaultEphemeral);

  // Form field states
  const [title, setTitle] = useState(initialValues?.title || "");
  const [courseCode, setCourseCode] = useState(initialValues?.courseCode || "");
  const [units, setUnits] = useState(initialValues?.units?.toString() || "");
  const [color, setColor] = useState(
    initialValues?.color && !initialValues.color.startsWith("#") ? initialValues.color : COLOR_OPTIONS[0]?.value,
  );
  const [customHex, setCustomHex] = useState(initialValues?.color?.startsWith("#") ? initialValues.color : "");
  const [icon, setIcon] = useState(
    initialValues?.icon
      ? initialValues.icon.charAt(0).toUpperCase() + initialValues.icon.slice(1).toLowerCase()
      : ICON_OPTIONS[0]?.value,
  );
  const [classLink, setClassLink] = useState(initialValues?.classLink || "");
  const [extraLink, setExtraLink] = useState(initialValues?.extraLink || "");
  const [professorName, setProfessorName] = useState(initialValues?.professor?.name || "");
  const [professorEmail, setProfessorEmail] = useState(initialValues?.professor?.email || "");
  const [expiresAt, setExpiresAt] = useState(initialValues?.expiresAt || "");

  // Schedule slot states
  const [slots, setSlots] = useState<ScheduleSlotInput[]>(
    initialValues?.schedules.map((s) => ({
      id: s.id, // ← preserve existing ID
      days: s.days,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      meetingLink: s.meetingLink || "",
    })) || [{ days: [], startTime: "", endTime: "", room: "", meetingLink: "" }],
  );

  const updateSlot = (index: number, field: keyof ScheduleSlotInput, value: string | DayOfWeek[]) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const addSlot = () => {
    if (slots.length < MAX_SCHEDULE_SLOTS) {
      setSlots([...slots, { days: [], startTime: "", endTime: "", room: "", meetingLink: "" }]);
    }
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 1) return; // Always keep at least one slot
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    // Validate each slot that has days selected
    const filledSlots = slots.filter((slot) => slot.days.length > 0);
    for (let i = 0; i < filledSlots.length; i++) {
      const slot = filledSlots[i];
      const label = `Slot ${slots.indexOf(slot) + 1}`;
      if (!slot.startTime || !isValidTime(slot.startTime)) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${label}: Invalid start time`,
          message: "Use H:MM or HH:MM format (e.g. 9:00, 09:00, or 14:30)",
        });
        return;
      }
      if (!slot.endTime || !isValidTime(slot.endTime)) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${label}: Invalid end time`,
          message: "Use H:MM or HH:MM format (e.g. 10:30, 9:00, or 16:00)",
        });
        return;
      }
      if (parseTime(slot.startTime) >= parseTime(slot.endTime)) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${label}: Start time must be before end time`,
        });
        return;
      }
    }

    if (isEphemeral && !expiresAt) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Expiry date required",
        message: "Please set an expiry date for ephemeral courses.",
      });
      return;
    }

    const validSlots: ScheduleSlot[] = slots
      .filter((slot) => slot.days.length > 0 && slot.startTime && slot.endTime)
      .map((slot) => ({
        id: slot.id ?? uuid(), // ← keep existing ID if present
        days: slot.days,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        meetingLink: slot.meetingLink || undefined,
      }));

    // Check for schedule conflicts
    if (existingCourses && existingCourses.length > 0) {
      const conflicts = detectConflicts(validSlots, existingCourses, initialValues?.id);
      if (conflicts.length > 0) {
        const conflictList = conflicts.map((c) => `${c.existingCourseTitle} on ${c.day}`).join(", ");
        await showToast({
          style: Toast.Style.Failure,
          title: "Schedule Conflict Detected",
          message: `Overlaps with: ${conflictList}. Edit times to resolve.`,
        });
        return; // Block save until resolved
      }
    }

    const resolvedColor = color === CUSTOM_COLOR_VALUE ? customHex || undefined : color;

    const course: Omit<Course, "id"> = {
      title: title.trim(),
      courseCode: courseCode || undefined,
      units: units ? parseFloat(units) : undefined,
      color: resolvedColor,
      icon,
      classLink: classLink || undefined,
      extraLink: extraLink || undefined,
      schedules: validSlots,
      professor: professorName ? { name: professorName, email: professorEmail || undefined } : undefined,
      ephemeral: isEphemeral,
      expiresAt: isEphemeral ? expiresAt : undefined,
    };

    onSubmit(course);
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={initialValues ? "Save Changes" : "Add Course"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          {slots.length < MAX_SCHEDULE_SLOTS && (
            <Action
              title="Add Another Schedule Slot"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={addSlot}
            />
          )}
          {slots.length > 1 && (
            <Action
              title="Remove Last Schedule Slot"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              onAction={() => removeSlot(slots.length - 1)}
            />
          )}
          {templates && templates.length > 0 && (
            <ActionPanel.Section title="Templates">
              {templates.map((t) => (
                <Action
                  key={t.id}
                  title={`Apply: ${t.name}`}
                  icon={Icon.Document}
                  onAction={() =>
                    setSlots(
                      t.slots.map((s) => ({
                        days: s.days,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        room: s.room,
                        meetingLink: s.meetingLink ?? "",
                      })),
                    )
                  }
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Course Title" value={title} onChange={setTitle} />

      <Form.TextField
        id="courseCode"
        title="Course Code"
        placeholder="e.g., CS 101"
        value={courseCode}
        onChange={setCourseCode}
      />

      {slots.map((slot, index) => (
        <Fragment key={index}>
          {/* Slot header as a visual separator */}
          <Form.Description
            title={`Schedule Slot ${index + 1}`}
            text={slots.length > 1 ? `Slot ${index + 1} of ${slots.length}` : "When does this course meet?"}
          />
          <Form.TagPicker
            id={`slot${index}_days`}
            title="Days"
            value={slot.days}
            onChange={(days) => updateSlot(index, "days", days as DayOfWeek[])}
          >
            {DAYS_OF_WEEK.map((day) => (
              <Form.TagPicker.Item key={day} title={day.slice(0, 3)} value={day} />
            ))}
          </Form.TagPicker>
          <Form.TextField
            id={`slot${index}_startTime`}
            title="Start Time"
            placeholder="09:00"
            value={slot.startTime}
            onChange={(value) => {
              const cleaned = value.replace(/[^0-9:]/g, "");
              if (cleaned.length <= 5) updateSlot(index, "startTime", cleaned);
            }}
          />
          <Form.TextField
            id={`slot${index}_endTime`}
            title="End Time"
            placeholder="10:30"
            value={slot.endTime}
            onChange={(value) => {
              const cleaned = value.replace(/[^0-9:]/g, "");
              if (cleaned.length <= 5) updateSlot(index, "endTime", cleaned);
            }}
          />
          <Form.TextField
            id={`slot${index}_room`}
            title="Room / Location"
            placeholder="e.g., Building A, Room 101"
            value={slot.room}
            onChange={(value) => updateSlot(index, "room", value)}
          />
          <Form.TextField
            id={`slot${index}_meetingLink`}
            title="Meeting Link"
            placeholder="https://..."
            value={slot.meetingLink}
            onChange={(value) => updateSlot(index, "meetingLink", value)}
          />
          {/* Show remove hint on the last slot when multiple slots exist */}
          {slots.length > 1 && index === slots.length - 1 && (
            <Form.Description title="" text="Press ⌘⇧N to remove this slot" />
          )}
        </Fragment>
      ))}

      <Form.Separator />

      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {COLOR_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.label}
            value={opt.value}
            icon={{ source: Icon.Circle, tintColor: resolveRaycastColor(opt.value) }}
          />
        ))}
      </Form.Dropdown>

      {color === CUSTOM_COLOR_VALUE && (
        <Form.TextField
          id="customHex"
          title="Hex Color"
          placeholder="#FF6B6B"
          value={customHex}
          onChange={setCustomHex}
        />
      )}

      <Form.Dropdown id="icon" title="Icon" value={icon?.toLowerCase()} onChange={setIcon}>
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.label}
            value={opt.value}
            icon={{ source: getIcon(opt.value) || Icon.Book }}
          />
        ))}
      </Form.Dropdown>

      <Form.Description title="Preview" text={`Selected: ${icon} icon with ${color} color`} />

      <Form.Separator />

      <Form.TextField
        id="units"
        title="Units"
        placeholder="e.g., 3"
        value={units}
        onChange={(value) => {
          if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setUnits(value);
          }
        }}
      />

      <Form.TextField
        id="classLink"
        title="Class Link"
        placeholder="https://..."
        value={classLink}
        onChange={setClassLink}
      />

      <Form.TextField
        id="extraLink"
        title="Extra Link"
        placeholder="https://..."
        value={extraLink}
        onChange={setExtraLink}
      />

      <Form.Separator />

      <Form.TextField
        id="professorName"
        title="Professor Name"
        placeholder="Professor's name"
        value={professorName}
        onChange={setProfessorName}
      />

      <Form.TextField
        id="professorEmail"
        title="Professor Email"
        placeholder="professor@university.edu"
        value={professorEmail}
        onChange={setProfessorEmail}
      />

      <Form.Separator />

      <Form.Checkbox
        id="ephemeral"
        title="Ephemeral Course"
        label="This course expires after a specific date"
        value={isEphemeral}
        onChange={setIsEphemeral}
      />

      {isEphemeral && (
        <Form.DatePicker
          id="expiresAt"
          title="Expires At"
          value={expiresAt ? new Date(expiresAt) : undefined}
          onChange={(date) => setExpiresAt(date ? date.toISOString().split("T")[0] : "")}
        />
      )}
    </Form>
  );
}
