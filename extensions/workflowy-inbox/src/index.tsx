import { Form, ActionPanel, Action, showToast, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import fetch from "cross-fetch";

type Values = {
  new_bullet_title: string;
  new_bullet_note: string;
  api_key: string;
  save_location_url: string;
};

interface Preferences {
  apiKey: string;
  saveLocationUrl: string;
}

async function submitToWorkflowy(values: Values) {
  const { apiKey, saveLocationUrl } = getPreferenceValues<Preferences>();
  const response = await fetch("https://beta.workflowy.com/api/bullets/create/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      new_bullet_id: uuidv4(),
      new_bullet_title: values.new_bullet_title,
      new_bullet_note: values.new_bullet_note,
      save_location_url: saveLocationUrl,
    }),
  });

  const data = await response.json();
  if (!data) {
    throw new Error(
      "Failed to submit the bullet to Workflowy. Please check your API key and save location url and then try again.",
    );
  }
}

async function validateWfApiKey() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch("https://beta.workflowy.com/api/me/", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  if (!data) {
    throw new Error("Invalid API Key. Set it in the extension preferences and try again.");
  }
}

export default function Command() {
  const { saveLocationUrl } = getPreferenceValues<Preferences>();
  async function handleSubmit(values: Values) {
    try {
      await validateWfApiKey();
      await submitToWorkflowy(values);
      showToast({ title: "Success!", message: "Added the bullet to your Workflowy inbox." });
    } catch {
      showToast({
        title: "Error",
        message:
          "Failed to submit the bullet to Workflowy. Please check your API key and save location url and then try again.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Get Workflowy API Key" url="https://workflowy.com/api-key/" />
          <Action.OpenInBrowser title="Open Workflowy Inbox" url={saveLocationUrl || ""} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField id="new_bullet_title" title="Bullet Text" placeholder="What would you like to remember?" />
      <Form.TextArea id="new_bullet_note" title="Bullet Note / Comment" placeholder="Any comments?" />
    </Form>
  );
}
