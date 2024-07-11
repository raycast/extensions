import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type { Color } from "@raycast/api";
import React, { useState } from "react";
import type { Timer } from "../utils/timerUtils";
import { ColorDropdown } from "./ColorDropdown";

interface EditTimerFormProps {
  timer: Timer;
  onUpdate: (timer: Timer) => void;
}

export function EditTimerForm({ timer, onUpdate }: EditTimerFormProps) {
  const [name, setName] = useState(timer.name);
  const [color, setColor] = useState<Color>(timer.color);
  const { pop } = useNavigation();

  const handleSubmit = () => {
    const updatedTimer: Timer = {
      ...timer,
      name,
      color,
      // Preserve the running state and startTime
      isRunning: timer.isRunning,
      startTime: timer.startTime,
    };
    onUpdate(updatedTimer);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <ColorDropdown value={color} onChange={(newValue) => setColor(newValue as Color)} />
    </Form>
  );
}
