import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createPreferenceClient } from "../api/preferenceClient";
import { updateFieldContent } from "../api/tanaService";
import type { NodeRef } from "./NodeActions";

type Values = {
  attributeId: string;
  content: string;
  clear: boolean;
  mode: string;
};

export function FieldContentForm({ node, onMutate }: { node: NodeRef; onMutate?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating Field");
      try {
        await updateFieldContent(
          createPreferenceClient(node.workspaceId),
          node.id,
          values.attributeId.trim(),
          values.clear ? null : values.content,
          values.mode === "append" ? "append" : "replace",
        );
        toast.style = Toast.Style.Success;
        toast.title = "Field Updated";
        onMutate?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: { attributeId: FormValidation.Required },
    initialValues: { attributeId: "", content: "", clear: false, mode: "replace" },
  });

  return (
    <Form
      navigationTitle={`Set Field Content · ${node.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Field Content" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Field ID" placeholder="Attribute node ID" {...itemProps.attributeId} />
      <Form.TextArea title="Content" placeholder="Text, number, or date value" {...itemProps.content} />
      <Form.Checkbox label="Clear this field" {...itemProps.clear} />
      <Form.Dropdown title="Mode" {...itemProps.mode}>
        <Form.Dropdown.Item title="Replace" value="replace" />
        <Form.Dropdown.Item title="Append" value="append" />
      </Form.Dropdown>
    </Form>
  );
}
