import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { Group, updateGroup } from "../db";
import { showErrorHUD } from "../utils";

interface RenameGroupViewProps {
  group: Group;
}

export function RenameGroupView({ group }: RenameGroupViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { title: string }) => {
    if (!values.title.trim()) return;
    setIsSubmitting(true);

    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming..." });

    try {
      await updateGroup(group.uuid, { title: values.title.trim() });
      toast.style = Toast.Style.Success;
      toast.title = "Group renamed";
      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to rename";
      await showErrorHUD("renaming group", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle={`Rename: ${group.title}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={group.title} autoFocus />
    </Form>
  );
}
