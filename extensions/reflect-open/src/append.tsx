import { Action, ActionPanel, closeMainWindow, Form, PopToRootType, showHUD } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { captureToDailyNote, TimestampFormat } from "./lib/reflect";

interface FormValues {
  note: string;
  isTask: boolean;
  prependTimestamp: boolean;
  timestampFormat: string;
}

export default function AppendToDailyNote() {
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const ok = await captureToDailyNote(values.note, {
        isTask: values.isTask,
        prependTimestamp: values.prependTimestamp,
        timestampFormat: values.timestampFormat as TimestampFormat,
      });

      if (ok) {
        await showHUD(values.isTask ? "Task captured for today" : "Captured for today");
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      }
    },
    initialValues: {
      isTask: false,
      prependTimestamp: false,
      timestampFormat: "12",
    },
    validation: {
      note: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Append to Daily Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.note} title="Note" placeholder="What's top of mind?" />
      <Form.Checkbox {...itemProps.isTask} label="Add as an open task" storeValue />
      <Form.Checkbox {...itemProps.prependTimestamp} label="Prepend the current time" storeValue />
      {values.prependTimestamp ? (
        <Form.Dropdown {...itemProps.timestampFormat} title="Timestamp Format" storeValue>
          <Form.Dropdown.Item value="12" title="12-hour (2:30 PM)" />
          <Form.Dropdown.Item value="24" title="24-hour (14:30)" />
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
