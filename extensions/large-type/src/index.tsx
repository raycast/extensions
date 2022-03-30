import { useState } from "react";
import { ActionPanel, closeMainWindow, Detail, Form, popToRoot, SubmitFormAction } from "@raycast/api";

interface CommandForm {
  message: string;
  messageStyle: "default" | "italic";
}

export default function Command() {
  const [message, setMessage] = useState("");
  const [messageStyle, setMessageStyle] = useState("default");

  function handleSubmit(values: CommandForm) {
    if (values.message !== "") {
      setMessageStyle(values.messageStyle);
      setMessage(values.message);
    }
  }

  function messageStyleClass() {
    switch (messageStyle) {
      case "italic":
        return `*${message}*`;
      case "default":
      default:
        return message;
    }
  }

  async function closeWindow() {
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });
  }

  if (message !== "") {
    return (
      <>
        <Detail
          markdown={`# ${messageStyleClass()}`}
          actions={
            <ActionPanel title="Large Type control">
              <ActionPanel.Item
                title="Back"
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() => setMessage("")}
              />
              <ActionPanel.Item
                title="Close Window"
                shortcut={{ modifiers: ["cmd"], key: "escape" }}
                onAction={() => closeWindow()}
              />
            </ActionPanel>
          }
        />
      </>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="Enter message" defaultValue="" />
      <Form.Dropdown id="messageStyle" title="Message Style" defaultValue="default">
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="italic" title="Italic" />
      </Form.Dropdown>
    </Form>
  );
}
