import { Form, ActionPanel, Action, Toast, Icon } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useState } from "react";
import { CreateTargetNodeAction } from "./TargetNodeCreateForm";
import { useTanaLocal } from "../state";
import { createPlainNode } from "../api";
import { CreateSupertagAction } from "./SupertagCreateForm";

type Values = {
  note: string;
  targetNodeId: string;
  supertagIds?: string[] | undefined;
};

export function AddToNodeForm() {
  const [loading, setLoading] = useState(false);
  const { targetNodes, supertags } = useTanaLocal();

  // cache target nodes and supertags for subsequent submissions
  const [targetNodeId, setTargetNodeId] = useCachedState<string>("targetNodeId", "INBOX");
  const [supertagIds, setSupertagIds] = useCachedState<string[]>("supertagIds", []);

  const { handleSubmit, itemProps, reset, setValue } = useForm<Values>({
    async onSubmit(values) {
      if (loading) {
        // return early to prevent double submission
        return;
      }

      setLoading(true);
      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating note" });
      await toast.show();

      try {
        await createPlainNode(
          {
            name: values.note,
            supertags: values.supertagIds?.map((id) => ({ id })),
          },
          values.targetNodeId,
        );
        toast.style = Toast.Style.Success;
        toast.message = "Note created";
        setTargetNodeId(values.targetNodeId);
        setSupertagIds(values.supertagIds || []);
        reset({ note: "", targetNodeId: values.targetNodeId, supertagIds: values.supertagIds });
      } catch (error) {
        let message: string | undefined = undefined;
        if (error instanceof Error) {
          message = error.message;
        }
        toast.style = Toast.Style.Failure;
        toast.message = message;
      } finally {
        setLoading(false);
      }
    },
    validation: {
      note: FormValidation.Required,
      targetNodeId: FormValidation.Required,
    },
    initialValues: {
      note: "",
      supertagIds,
      targetNodeId,
    },
  });

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} icon={Icon.Plus} />
          <CreateTargetNodeAction
            shortcut={false}
            onCreate={(node) => {
              setValue("targetNodeId", node.id);
            }}
          />
          <CreateSupertagAction
            shortcut={false}
            onCreate={(tag) => {
              setValue("supertagIds", [...(itemProps.supertagIds.value || []), tag.id]);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Note" placeholder="Enter note" {...itemProps.note} />
      <Form.Dropdown title="Target node" {...itemProps.targetNodeId}>
        <Form.Dropdown.Section>
          <Form.Dropdown.Item title="Inbox" value="INBOX" />
        </Form.Dropdown.Section>
        {targetNodes.length > 0 && (
          <Form.Dropdown.Section title="Custom nodes">
            {targetNodes.map((node) => (
              <Form.Dropdown.Item key={node.id} title={node.name} value={node.id} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TagPicker title="Supertags" {...itemProps.supertagIds}>
        {supertags.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.id}
            // title={`#${tag.name}`}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
