import { Form, ActionPanel, Action, Toast, Icon } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useState } from "react";
import { AddTargetNodeAction } from "./TargetNodeForm";
import { useTanaLocal } from "../state";
import { createPlainNode } from "../api";

type Values = {
  note: string;
  targetNodeId: string;
  newTargetNodeName?: string;
  newTargetNodeId?: string;
  superTagId?: string | undefined;
};

export function AddToNodeForm() {
  const [loading, setLoading] = useState(false);
  const { targetNodes } = useTanaLocal();

  // cache the target node for subsequent submissions
  const [targetNodeId, setTargetNodeId] = useCachedState<string>("targetNodeId", "INBOX");

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
          },
          values.targetNodeId,
        );
        toast.style = Toast.Style.Success;
        toast.message = "Note created";
        setTargetNodeId(values.targetNodeId);
        reset({ note: "", targetNodeId: values.targetNodeId });
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
      superTagId: "",
      targetNodeId,
    },
  });

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create note" onSubmit={handleSubmit} icon={Icon.Plus} />
          <AddTargetNodeAction
            shortcut={false}
            onAdd={(node) => {
              setValue("targetNodeId", node.id);
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
    </Form>
  );
}
