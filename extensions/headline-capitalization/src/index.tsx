import { Clipboard, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import TitleCapsEditor from "../assets/js/title-caps";
import { useState } from "react";

type Values = {
  text_input: string;
  options: string;
};

async function copyToClipboard(value: string) {
  const content: Clipboard.Content = { text: value };
  try {
    await Clipboard.copy(content);
    showToast({ style: Toast.Style.Animated, title: "Copying to clipboard", message: "" });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error: Could not copy to clipboard.",
      message: `Please contact developer. ${error}`,
    });
  } finally {
    const clipboardContent = await Clipboard.readText();
    showToast({ style: Toast.Style.Success, title: "Copied to clipboard", message: clipboardContent });
  }
}

export default function Command() {
  const [capitalizedTitle, setCapitalizedTitle] = useState("");

  function handleChange(value: string): void {
    const editor = new TitleCapsEditor(value);
    editor.setMode(3);
    const capitalised = editor.titleCaps(value);
    setCapitalizedTitle(capitalised);
  }

  function handleDropdownChange(value: string): void {
    const editor = new TitleCapsEditor("");
    editor.setMode(Number(value));
    const capitalised = editor.titleCaps(capitalizedTitle);
    setCapitalizedTitle(capitalised);
  }

  function handleSubmit(values: Values) {
    const capitalised = values.text_input;
    copyToClipboard(capitalised);
  }

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} title="Copy to Clipboard" />
          </ActionPanel>
        }
      >
        <Form.Description text="Enter your Headline, then select the Capitalization Style." />
        <Form.TextField
          id="text_input"
          title="Headline"
          placeholder="Enter your Headline"
          onChange={(value) => handleChange(value)}
          value={capitalizedTitle}
        />
        <Form.Dropdown id="options" title="Capitalization Style" onChange={(value) => handleDropdownChange(value)}>
          <Form.Dropdown.Item value="2" title="Capitalize With 4+ Letters (AP Style)" />
          <Form.Dropdown.Item value="3" title="Capitalize with 5+ Letters (APA Style)" />
          <Form.Dropdown.Item value="4" title="Don't Capitalize Based on Length (Chicago Style)" />
        </Form.Dropdown>
      </Form>
    </>
  );
}
