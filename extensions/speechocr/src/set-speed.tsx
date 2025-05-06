// src/set-speed.tsx
import { LocalStorage, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [current, setCurrent] = useState("175");

  useEffect(() => {
    LocalStorage.getItem("speechRate").then((value) => {
      if (value) setCurrent(value.toString());
    });
  }, []);

  const handleSubmit = async (values: { speed: string }) => {
    await LocalStorage.setItem("speechRate", values.speed);
    await showToast({ style: Toast.Style.Success, title: `Speed set to ${values.speed} wpm` });
  };

  return (
    <Form
      navigationTitle="Set OCR Speech Speed"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Speed" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="speed" title="Speech Rate" defaultValue={current}>
        <Form.Dropdown.Item value="150" title="150 – Slow" />
        <Form.Dropdown.Item value="175" title="175 – Normal" />
        <Form.Dropdown.Item value="200" title="200 – Fast" />
        <Form.Dropdown.Item value="250" title="250 – Very Fast" />
      </Form.Dropdown>
    </Form>
  );
}
