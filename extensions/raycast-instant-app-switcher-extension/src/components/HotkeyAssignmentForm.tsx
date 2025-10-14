import { useState } from "react";
import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { App } from "../types";

interface HotkeyAssignmentFormProps {
  app: App;
  onAssign: (hotkey: string) => Promise<void>;
}

/**
 * Form component for assigning a hotkey to an application
 */
export function HotkeyAssignmentForm({ app, onAssign }: HotkeyAssignmentFormProps) {
  const [hotkey, setHotkey] = useState("");
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Assign Hotkey"
            onSubmit={async (values: { hotkey: string }) => {
              if (values.hotkey && values.hotkey.trim()) {
                await onAssign(values.hotkey.trim().toLowerCase());
                pop();
              }
            }}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hotkey"
        title="Hotkey"
        placeholder="Enter hotkey sequence (e.g., f or ff)"
        value={hotkey}
        onChange={setHotkey}
        info="Enter a character or sequence that will be used as a hotkey for this app"
      />
      <Form.Description title="App" text={app.name} />
    </Form>
  );
}
