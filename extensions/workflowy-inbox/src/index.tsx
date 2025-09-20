import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { setTimeout } from "timers/promises";
import { useForm, FormValidation } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import fetch from "cross-fetch";

type InboxFormValues = {
  new_bullet_title: string;
  new_bullet_note: string;
  api_key: string;
  save_location_url: string;
};

interface Preferences {
  apiKey: string;
  saveLocationUrl: string;
}

async function submitToWorkflowy(values: InboxFormValues): Promise<void> {
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
  if (!data || !response.ok) {
    throw new Error(
      "Failed to submit the bullet to Workflowy. Please check your API key and save location url and then try again.",
    );
  }
}

async function validateWfApiKey(): Promise<void> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch("https://beta.workflowy.com/api/me/", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  if (!data || !response.ok) {
    throw new Error("Invalid API Key. Set it in the extension preferences and try again.");
  }
}

export default function Command(): React.ReactElement {
  const { handleSubmit, itemProps, reset } = useForm<InboxFormValues>({
    async onSubmit(values) {
      try {
        await validateWfApiKey();
        await submitToWorkflowy(values);
        await showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Added the bullet to your Workflowy inbox.",
        });
        reset();
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message:
            "Failed to submit the bullet to Workflowy. Please check your API key and save location url and then try again.",
        });
      }
    },
    validation: {
      new_bullet_title: FormValidation.Required,
    },
  });
  const { saveLocationUrl } = getPreferenceValues<Preferences>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: "send.svg" }}
            title="Send and Close"
            onSubmit={async (values) => {
              await handleSubmit(values as InboxFormValues);
              // This allows the success message to show for a second before closing the window.
              await setTimeout(1000);
              await closeMainWindow({ popToRootType: PopToRootType.Immediate });
            }}
          />
          <Action.SubmitForm icon={{ source: "send.svg" }} title="Send and Add Another" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={{ source: "key.svg" }}
            title="Get Workflowy API Key"
            url="https://workflowy.com/api-key/"
          />
          <Action.OpenInBrowser
            icon={{ source: "inbox.svg" }}
            title="Open Workflowy Inbox"
            url={saveLocationUrl || ""}
          />
          <Action
            icon={{ source: "settings.svg" }}
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Bullet Text"
        placeholder="What would you like to remember?"
        {...itemProps.new_bullet_title}
      />
      <Form.TextArea title="Bullet Note / Comment" placeholder="Any comments?" {...itemProps.new_bullet_note} />
    </Form>
  );
}
