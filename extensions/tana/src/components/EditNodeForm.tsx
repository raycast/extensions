import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { createPreferenceClient } from "../api/preferenceClient";
import { editNode } from "../api/tanaService";
import type { NodeRef } from "./NodeActions";

type Values = { name: string; description: string; clearName: boolean; clearDescription: boolean };

export function EditNodeForm({ node, onMutate }: { node: NodeRef; onMutate?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Editing Node");
      try {
        await editNode(createPreferenceClient(node.workspaceId), node.id, {
          name: { from: node.name, to: values.clearName ? null : values.name },
          description: { from: node.description ?? "", to: values.clearDescription ? null : values.description },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Node Edited";
        onMutate?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    initialValues: {
      name: node.name,
      description: node.description ?? "",
      clearName: false,
      clearDescription: false,
    },
  });

  return (
    <Form
      navigationTitle={`Edit · ${node.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Node Changes" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Checkbox label="Clear node name" {...itemProps.clearName} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.Checkbox label="Clear description" {...itemProps.clearDescription} />
      <Form.Description text="Review the complete replacement values before submitting." />
    </Form>
  );
}
