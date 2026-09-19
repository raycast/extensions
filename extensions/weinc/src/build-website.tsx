import { Action, ActionPanel, Form, closeMainWindow, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";

interface FormValues {
  prompt: string;
}

export default function BuildWebsite() {
  const [promptError, setPromptError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    const prompt = values.prompt.trim();
    if (!prompt) {
      setPromptError("Describe the website you want to build");
      return;
    }
    const url = `https://my.we.inc/build?prompt=${encodeURIComponent(prompt)}`;
    try {
      await open(url);
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open browser",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Build Website" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="A landing page for my coffee shop with a menu and contact form…"
        error={promptError}
        onChange={() => setPromptError(undefined)}
        autoFocus
      />
      <Form.Description text="Opens WeInc in your browser and starts building the site from your prompt." />
    </Form>
  );
}
