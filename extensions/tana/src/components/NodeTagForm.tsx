import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { TanaTag } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { listTags, updateNodeTags } from "../api/tanaService";
import type { NodeRef } from "./NodeActions";

type Values = { action: string; tagIds: string[] };

export function NodeTagForm({ node, onMutate }: { node: NodeRef; onMutate?: () => void }) {
  const { pop } = useNavigation();
  const [tags, setTags] = useState<TanaTag[]>([]);
  const [loading, setLoading] = useState(true);
  const client = createPreferenceClient(node.workspaceId);
  const workspaceId = node.workspaceId || client.workspaceId;

  useEffect(() => {
    let active = true;
    listTags(client, workspaceId)
      .then(
        (items) => active && setTags(items),
        async (error) => {
          if (active)
            await showToast(
              Toast.Style.Failure,
              "Unable to Load Tags",
              error instanceof Error ? error.message : undefined,
            );
        },
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const action = values.action === "remove" ? "remove" : "add";
      const toast = await showToast(Toast.Style.Animated, action === "add" ? "Adding Tags" : "Removing Tags");
      try {
        await updateNodeTags(client, node.id, values.tagIds, action);
        toast.style = Toast.Style.Success;
        toast.title = action === "add" ? "Tags Added" : "Tags Removed";
        onMutate?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: { tagIds: FormValidation.Required },
    initialValues: { action: "add", tagIds: [] },
  });

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Update Tags · ${node.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tags" icon={Icon.Tag} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Action" {...itemProps.action}>
        <Form.Dropdown.Item title="Add" value="add" />
        <Form.Dropdown.Item title="Remove" value="remove" />
      </Form.Dropdown>
      <Form.TagPicker title="Tags" {...itemProps.tagIds}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} title={tag.name} value={tag.id} icon={Icon.Tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
