import { closeMainWindow, Clipboard, Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { setTimeout } from "timers/promises";
import { toLaxTitleCase } from "titlecase";
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

    await setTimeout(1000);

    await closeMainWindow({ clearRootSearch: true });
  }
}

export default function Command() {
  const [capitalizedTitle, setCapitalizedTitle] = useState("");

  function handleChange(value: string): void {
    const output = toLaxTitleCase(value);
    setCapitalizedTitle(output);
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
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Wand} title="Copy to Clipboard" />
          </ActionPanel>
        }
      >
        <Form.Description text="Enter your text, and the output will be copied to clipboard." />
        <Form.TextField
          id="text_input"
          title="Text"
          placeholder="Enter your text"
          onChange={(value) => handleChange(value)}
          value={capitalizedTitle}
        />
      </Form>
    </>
  );
}
