import { Action, ActionPanel, Color, Form, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import type { Timer } from "../utils/timerUtils";
import { ColorDropdown } from "./ColorDropdown";

interface AddNewTimerFormProps {
  onAdd: (timer: Timer) => void;
}

export function AddNewTimerForm({ onAdd }: AddNewTimerFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<Color>(Color.Red);
  const { pop } = useNavigation();

  const handleSubmit = () => {
    const newTimer: Timer = {
      id: Date.now().toString(),
      name,
      color,
      totalSeconds: 0,
      isRunning: false,
      logs: [],
    };
    onAdd(newTimer);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <ColorDropdown value={color} onChange={(newValue) => setColor(newValue as Color)} />
    </Form>
  );
}
