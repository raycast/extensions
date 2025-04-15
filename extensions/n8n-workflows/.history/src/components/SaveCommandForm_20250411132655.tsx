import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { addSavedCommand } from "../utils/storage-utils";
import { SavedCommand } from "../types/types";

// Props expected from WebhookTriggerForm
interface SaveCommandFormProps extends Omit<SavedCommand, 'id' | 'name'> {
  // Inherits method, url, headers?, queryParams?, body?
}

export default function SaveCommandForm(props: SaveCommandFormProps) {
  console.log("SaveCommandForm: Rendering with props:", JSON.stringify({
    method: props.method,
    url: props.url,
    hasHeaders: !!props.headers,
    hasQueryParams: !!props.queryParams,
    hasBody: !!props.body
  }));
  
  // Ensure all props are properly defined with fallbacks
  const {
    method = "GET",
    url = "",
    headers = "",
    queryParams = "",
    body = ""
  } = props;
  
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name || values.name.trim().length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    const commandData: Omit<SavedCommand, 'id'> = {
      name: values.name.trim(),
      method: method,
      url: url,
      headers: headers || "",
      queryParams: queryParams || "",
      body: body || "",
    };

    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving command..." });

    try {
      await addSavedCommand(commandData);
      toast.style = Toast.Style.Success;
      toast.title = "Command Saved Successfully";
      toast.message = `Saved "${commandData.name}"`;
      pop(); // Go back after saving
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Save Command";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      navigationTitle="Save Webhook Command"
      actions={
        <ActionPanel>
         <ActionPanel.Section>
          <Action.SubmitForm title="Save Command" icon={Icon.HardDrive} onSubmit={handleSubmit} />
         </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Webhook URL" text={url} />
      <Form.Description title="Method" text={method} />
      {headers && <Form.Description title="Headers" text={headers} />}
      {queryParams && <Form.Description title="Query Parameters" text={queryParams} />}
      {body && <Form.Description title="Body" text={body} />}
      <Form.Separator />
      <Form.TextField
        id="name"
        title="Command Name"
        placeholder="e.g., Trigger Daily Report"
        autoFocus={true}
      />
    </Form>
  );
}
