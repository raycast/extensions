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
  open,
} from "@raycast/api";
import { setTimeout } from "timers/promises";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { API_HEADERS, API_URL } from "./config";

const { saveLocationUrl } = getPreferenceValues<Preferences>();
type InboxFormValues = {
  new_bullet_title: string;
  new_bullet_note: string;
};

async function submitToWorkflowy(values: InboxFormValues): Promise<void> {
  const response = await fetch(API_URL + "bullets/create/", {
    method: "POST",
    headers: API_HEADERS,
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

export default function Command(): React.ReactElement {
  const { handleSubmit, itemProps, reset } = useForm<InboxFormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Submitting");
      try {
        await submitToWorkflowy(values);
        toast.style = Toast.Style.Success;
        toast.title = "Success!";
        toast.message = "Added the bullet to your Workflowy inbox.";
        reset();
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message =
          "Failed to submit the bullet to Workflowy. Please check your API key and save location url and then try again.";
        toast.primaryAction = {
          title: "Open Extension Preferences",
          onAction: openExtensionPreferences,
        };
        return false;
      }
    },
    validation: {
      new_bullet_title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: "send.svg" }}
            title="Send and Close"
            onSubmit={async (values) => {
              const success = await handleSubmit(values as InboxFormValues);
              if (!success) return;
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
          <Action
            icon={{ source: "inbox.svg" }}
            title="Open Workflowy Inbox"
            onAction={() => {
              try {
                new URL(saveLocationUrl);
                open(saveLocationUrl);
              } catch {
                showFailureToast("Invalid Workflowy save location URL.", {
                  title: "Error",
                });
              }
            }}
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
