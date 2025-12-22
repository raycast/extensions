import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { Group, Activity, updateActivity } from "../db";
import { showErrorHUD } from "../utils";

interface RenameActivityViewProps {
  group: Group;
  activity: Activity;
}

export function RenameActivityView({ group, activity }: RenameActivityViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { title: string }) => {
    if (!values.title.trim()) return;
    setIsSubmitting(true);

    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming..." });

    try {
      await updateActivity(group.uuid, activity.uuid, { title: values.title.trim() });
      toast.style = Toast.Style.Success;
      toast.title = "Activity renamed";
      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to rename";
      await showErrorHUD("renaming activity", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle={`Rename: ${activity.title}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={activity.title} autoFocus />
    </Form>
  );
}
