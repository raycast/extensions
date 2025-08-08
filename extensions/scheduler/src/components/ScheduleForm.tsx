import { Form } from "@raycast/api";
import { ScheduleType, ScheduledCommand } from "../types";

interface ScheduleFormProps {
  scheduleType: ScheduleType;
  onScheduleTypeChange: (value: ScheduleType) => void;
  command?: ScheduledCommand;
}

export function ScheduleForm({ scheduleType, onScheduleTypeChange, command }: ScheduleFormProps) {
  return (
    <>
      <Form.Dropdown
        id="scheduleType"
        title="Schedule Type"
        value={scheduleType}
        onChange={(value) => onScheduleTypeChange(value as ScheduleType)}
      >
        <Form.Dropdown.Item value="once" title="Once" />
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
      </Form.Dropdown>

      {scheduleType === "once" && (
        <Form.DatePicker
          id="date"
          title="Date"
          info="Select the date when the command should run"
          defaultValue={command?.schedule.date ? new Date(command.schedule.date) : undefined}
          min={new Date(new Date().setDate(new Date().getDate() - 2))} // Allow selecting today or later
          type={Form.DatePicker.Type.Date}
        />
      )}

      <Form.TextField
        id="time"
        title="Time"
        placeholder="09:00"
        info="Enter time in 24-hour format (HH:MM)"
        defaultValue={command?.schedule.time}
      />

      {scheduleType === "weekly" && (
        <Form.Dropdown id="dayOfWeek" title="Day of Week" defaultValue={command?.schedule.dayOfWeek?.toString()}>
          <Form.Dropdown.Item value="1" title="Monday" />
          <Form.Dropdown.Item value="2" title="Tuesday" />
          <Form.Dropdown.Item value="3" title="Wednesday" />
          <Form.Dropdown.Item value="4" title="Thursday" />
          <Form.Dropdown.Item value="5" title="Friday" />
          <Form.Dropdown.Item value="6" title="Saturday" />
          <Form.Dropdown.Item value="7" title="Sunday" />
        </Form.Dropdown>
      )}

      {scheduleType === "monthly" && (
        <Form.Dropdown id="dayOfMonth" title="Day of Month" defaultValue={command?.schedule.dayOfMonth?.toString()}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <Form.Dropdown.Item key={day} value={day.toString()} title={`Day ${day}`} />
          ))}
        </Form.Dropdown>
      )}
    </>
  );
}
