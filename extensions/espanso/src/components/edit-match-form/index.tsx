import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { updateMatchInFile } from "../../lib/utils";

interface EditMatchFormProps {
  filePath: string;
  originalTriggers: string[];
  initialTrigger: string;
  initialLabel?: string;
  initialReplace: string;
  onEdited: () => void;
}

interface Values {
  trigger: string;
  label?: string;
  replace: string;
}

export default function EditMatchForm({
  filePath,
  originalTriggers,
  initialTrigger,
  initialLabel,
  initialReplace,
  onEdited,
}: EditMatchFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { trigger: initialTrigger, label: initialLabel ?? "", replace: initialReplace },
    onSubmit(values) {
      const triggers = values.trigger
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (!triggers.length) {
        showToast({ style: Toast.Style.Failure, title: "At least one trigger is required" });
        return;
      }
      try {
        updateMatchInFile(filePath, originalTriggers, { triggers, label: values.label, replace: values.replace });
        showToast({ style: Toast.Style.Success, title: "Match updated" });
        onEdited();
        pop();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to update match",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    validation: { trigger: FormValidation.Required, replace: FormValidation.Required },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Trigger(s)"
        info="A trigger or comma-separated list of triggers"
        placeholder="Enter trigger"
        {...itemProps.trigger}
      />
      <Form.TextField
        title="Label"
        info="A human-readable text of the trigger"
        placeholder="Enter label"
        {...itemProps.label}
      />
      <Form.TextArea
        title="Replace"
        info="The replacement text"
        placeholder="Enter replacement"
        {...itemProps.replace}
      />
      <Form.Description title="File" text={filePath.replace(process.env.HOME ?? "", "~")} />
    </Form>
  );
}
