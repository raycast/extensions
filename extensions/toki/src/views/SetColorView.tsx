import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { Group, updateGroup } from "../db";
import { showErrorHUD, refreshMenuBar } from "../utils";

interface SetColorViewProps {
  group: Group;
}

export function SetColorView({ group }: SetColorViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { color: string }) => {
    const color = values.color.trim();
    if (!color.match(/^#[0-9A-Fa-f]{6}$/)) return;
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving..." });

    try {
      await updateGroup(group.uuid, { color });
      toast.style = Toast.Style.Success;
      toast.title = "Color updated";
      refreshMenuBar();
      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update";
      await showErrorHUD("updating color", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle={`Color: ${group.title}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="color" title="Color (hex)" placeholder="#FF5733" defaultValue={group.color} autoFocus />
    </Form>
  );
}
