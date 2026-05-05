import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";

import { createLabel } from "../issue-data";
import { LABEL_COLOR_OPTIONS } from "../issue-types";

interface LabelFormProps {
  onSave?: () => void;
}

export function LabelForm({ onSave }: LabelFormProps) {
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    async (values: { name: string; color: string }) => {
      if (!values.name.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Label name is required" });
        return;
      }
      createLabel(values.name.trim(), values.color);
      await showToast({ style: Toast.Style.Success, title: `Created label "${values.name.trim()}"` });
      onSave?.();
      pop();
    },
    [onSave, pop],
  );

  return (
    <Form
      navigationTitle="New Label"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Label"
            onSubmit={(v) => void handleSubmit(v as { name: string; color: string })}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Label name" autoFocus />
      <Form.Dropdown id="color" title="Color" defaultValue={LABEL_COLOR_OPTIONS[0]}>
        {LABEL_COLOR_OPTIONS.map((hex) => (
          <Form.Dropdown.Item key={hex} value={hex} title={hex} icon={{ source: Icon.Circle, tintColor: hex }} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
