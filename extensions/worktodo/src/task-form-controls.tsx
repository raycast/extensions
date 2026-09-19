import { Form, Icon } from "@raycast/api";
import { taskEditingProjectKey, type DueDatePreset } from "./shared/application/task-editing";
import type { Label, Project } from "./shared/domain/model";

export function ProjectDropdown({
  projects,
  value,
  error,
  onChange,
}: {
  projects: readonly Project[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Form.Dropdown id="project" title="Project" value={value} error={error} onChange={onChange}>
      <Form.Dropdown.Item value="no-project" title="No project" icon={Icon.Minus} />
      {projects.map((project) => (
        <Form.Dropdown.Item
          key={project.id}
          value={taskEditingProjectKey(project.id)}
          title={project.name}
          icon={Icon.Folder}
        />
      ))}
    </Form.Dropdown>
  );
}

export function LabelPicker({
  labels,
  value,
  error,
  onChange,
}: {
  labels: readonly Label[];
  value: string[];
  error?: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <Form.TagPicker id="labels" title="Labels" value={value} error={error} onChange={onChange}>
      {labels.map((label) => (
        <Form.TagPicker.Item key={label.id} value={label.id} title={label.name} />
      ))}
    </Form.TagPicker>
  );
}

export function DueDateFields({
  preset,
  customDate,
  error,
  onPresetChange,
  onCustomDateChange,
}: {
  preset: DueDatePreset;
  customDate: Date | null;
  error?: string;
  onPresetChange: (preset: DueDatePreset) => void;
  onCustomDateChange: (date: Date | null) => void;
}) {
  return (
    <>
      <Form.Dropdown
        id="dueDatePreset"
        title="Due date"
        value={preset}
        onChange={(value) => onPresetChange(value as DueDatePreset)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="tomorrow" title="Tomorrow" />
        <Form.Dropdown.Item value="endOfWeek" title="End of week" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      {preset === "custom" ? (
        <Form.DatePicker
          id="customDueDate"
          title="Custom date"
          type={Form.DatePicker.Type.Date}
          value={customDate}
          error={error}
          onChange={onCustomDateChange}
        />
      ) : null}
    </>
  );
}
