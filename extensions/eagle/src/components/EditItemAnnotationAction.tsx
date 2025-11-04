import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { updateItem } from "../utils/api";
import type { Item } from "../@types/eagle";

interface EditItemAnnotationActionProps {
  item: Item;
  onUpdate?: () => void;
}

function EditAnnotationForm({ item, onUpdate }: EditItemAnnotationActionProps) {
  const [annotation, setAnnotation] = useState(item.annotation.replaceAll("<br>", "\n"));
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating annotation...",
      });

      await updateItem({
        id: item.id,
        annotation: annotation || "",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Annotation updated",
      });

      if (onUpdate) {
        onUpdate();
      }

      pop();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to update annotation",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Annotation" icon={Icon.Text} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="annotation"
        title="Annotation"
        placeholder="Add notes or description"
        value={annotation}
        onChange={setAnnotation}
      />
    </Form>
  );
}

export function EditItemAnnotationAction({ item, onUpdate }: EditItemAnnotationActionProps) {
  return (
    <Action.Push
      title="Edit Annotation"
      icon={Icon.Text}
      target={<EditAnnotationForm item={item} onUpdate={onUpdate} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}
