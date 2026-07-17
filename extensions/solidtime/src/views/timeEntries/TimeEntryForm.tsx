import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { CreateTimeEntryBody, TimeEntry } from "../../api/index.js";
import { getTimeStamp } from "../../utils/time.js";
import { ProjectDropdown } from "../shared/ProjectDropdown.js";

export function TimeEntryForm(props: { initialValues?: TimeEntry; onSubmit: (values: CreateTimeEntryBody) => void }) {
  const { handleSubmit, itemProps } = useForm<CreateTimeEntryBody>({
    onSubmit: props.onSubmit,
    initialValues: {
      start: getTimeStamp(),
      ...props.initialValues,
    },
  });

  return (
    <Form
      navigationTitle="Create Time Entry"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Description"
        placeholder="What are you working on?"
        {...itemProps.description}
        value={itemProps.description.value ?? undefined}
        defaultValue={itemProps.description.defaultValue ?? undefined}
      />

      <ProjectDropdown
        {...itemProps.project_id}
        value={itemProps.project_id.value ?? undefined}
        defaultValue={itemProps.project_id.defaultValue ?? undefined}
      />

      <Form.Checkbox label="Billable" {...itemProps.billable} />
    </Form>
  );
}
