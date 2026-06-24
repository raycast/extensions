import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createPreferenceClient } from "../api/preferenceClient";
import { updateFieldOption } from "../api/tanaService";
import type { NodeRef } from "./NodeActions";

type Values = { attributeId: string; optionId: string; mode: string };

export function FieldOptionForm({ node, onMutate }: { node: NodeRef; onMutate?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating Field Option");
      try {
        await updateFieldOption(
          createPreferenceClient(node.workspaceId),
          node.id,
          values.attributeId.trim(),
          values.optionId.trim(),
          values.mode === "append" ? "append" : "replace",
        );
        toast.style = Toast.Style.Success;
        toast.title = "Field Option Updated";
        onMutate?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: { attributeId: FormValidation.Required, optionId: FormValidation.Required },
    initialValues: { attributeId: "", optionId: "", mode: "replace" },
  });

  return (
    <Form
      navigationTitle={`Set Field Option · ${node.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Field Option" icon={Icon.List} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Field ID" placeholder="Attribute node ID" {...itemProps.attributeId} />
      <Form.TextField title="Option ID" placeholder="Option node ID" {...itemProps.optionId} />
      <Form.Dropdown title="Mode" {...itemProps.mode}>
        <Form.Dropdown.Item title="Replace" value="replace" />
        <Form.Dropdown.Item title="Append" value="append" />
      </Form.Dropdown>
    </Form>
  );
}
