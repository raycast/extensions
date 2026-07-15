import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { isValidHexColor } from "../helpers";
import { TagDefinition } from "../types";

export function EditTagForm({
  tagDef,
  onEdit,
}: {
  tagDef: TagDefinition;
  onEdit: (id: string, newName: string, newColor: string) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(tagDef.name);
  const [color, setColor] = useState(tagDef.color);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handle() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!name) {
      await showToast(Toast.Style.Failure, "Tag name cannot be empty");
      setIsSubmitting(false);
      return;
    }
    if (!isValidHexColor(color)) {
      await showToast(Toast.Style.Failure, "Invalid HEX color", "Use #RRGGBB like #00FF00");
      setIsSubmitting(false);
      return;
    }
    await onEdit(tagDef.id, name.trim(), color);
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit ${tagDef.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handle} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Tag Name" value={name} onChange={setName} />
      <Form.TextField id="color" title="Color (HEX)" value={color} onChange={setColor} />
    </Form>
  );
}
