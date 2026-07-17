import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { isValidHexColor, randomColor } from "../helpers";

export function CreateTagForm({ onCreate }: { onCreate: (name: string, color: string) => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(randomColor());
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
      await showToast(Toast.Style.Failure, "Invalid HEX color", "Use #RRGGBB like #FF0000");
      setIsSubmitting(false);
      return;
    }
    await onCreate(name.trim(), color);
    pop();
  }

  return (
    <Form
      navigationTitle="Create Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handle} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Tag Name" placeholder="e.g. Work" value={name} onChange={setName} />
      <Form.TextField id="color" title="Color (HEX)" value={color} onChange={setColor} />
    </Form>
  );
}
