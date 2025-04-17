import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { triggerWebhook } from "../utils/n8n-api-utils";
import SaveCommandForm from "./SaveCommandForm"; // Import SaveCommandForm (will create next)

interface WebhookTriggerFormProps {
  instanceUrl: string;
  method: string;
  path: string;
  workflowName: string;
}

// Helper to parse headers string into Record
function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headersString) return headers;
  const lines = headersString.split('\n');
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      if (key && value) {
        headers[key] = value;
      }
    }
  });
  return headers;
}

export default function WebhookTriggerForm(props: WebhookTriggerFormProps) {
  const { instanceUrl, method, path, workflowName } = props;
  const { pop } = useNavigation(); // Only need pop here
  const [headers, setHeaders] = useState<string>(""); // State for headers
  const [queryParams, setQueryParams] = useState<string>(""); // State for query params
  const [body, setBody] = useState<string>(""); // State for body
  const [headersError, setHeadersError] = useState<string | undefined>();
  const [bodyError, setBodyError] = useState<string | undefined>();

  // Construct the base webhook URL
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  const webhookBaseUrl = `${baseUrl}/webhook/${path}`; // Assumes /webhook/ path prefix

  // Determine if body field should be shown
  const showBodyField = ["POST", "PUT", "PATCH"].includes(method.toUpperCase());

  // Use state variables for submission, ignore 'values' argument
  async function handleSubmit() {
    setHeadersError(undefined);
    setBodyError(undefined);

    const parsedHeaders = parseHeaders(headers); // Use headers state

    // Basic validation for JSON body if provided
    if (showBodyField && body) { // Use body state
      try {
        JSON.parse(body);
      } catch (e) {
        setBodyError("Invalid JSON format");
        return; // Prevent submission
      }
    }

    // Construct final URL with query params state
    const finalUrl = queryParams ? `${webhookBaseUrl}?${queryParams}` : webhookBaseUrl;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending webhook..." });

    try {
      // Pass parsed headers and conditional body state
      const result = await triggerWebhook(finalUrl, method, parsedHeaders, showBodyField ? body : undefined);

      if (result.ok) {
        toast.style = Toast.Style.Success;
        toast.title = "Webhook Sent Successfully";
        toast.message = `Status: ${result.status}. Response: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`;
        pop(); // Close form on success
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Webhook Request Failed";
        toast.message = `Status: ${result.status}. Response: ${result.body}`;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Send Webhook";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      navigationTitle={`Trigger: ${workflowName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Webhook" icon={Icon.Upload} onSubmit={handleSubmit} />
          {/* Pass state values down to the Save action */}
          <ActionSaveCommand
            method={method}
            webhookBaseUrl={webhookBaseUrl}
            headers={headers}
            queryParams={queryParams}
            body={body}
            showBodyField={showBodyField}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Workflow" text={workflowName} />
      <Form.Description title="Method" text={method} />
      <Form.Description title="URL" text={webhookBaseUrl} />
      <Form.Separator />

      <Form.TextField
        id="queryParams"
        title="Query Parameters"
        placeholder="key=value&key2=value2"
        info="Enter URL query parameters as a single string (e.g., name=test&status=active)"
        value={queryParams} // Bind to state
        onChange={setQueryParams} // Update state
      />

      <Form.TextArea
        id="headers"
        title="Headers"
        placeholder="Header-Name: Value&#10;Authorization: Bearer your_token"
        info="One header per line, separated by a colon (:)."
        value={headers} // Bind to state
        error={headersError}
        onChange={(newValue) => {
            setHeaders(newValue); // Update state
            if (headersError) setHeadersError(undefined); // Clear error on change
        }}
      />

      {showBodyField && (
        <Form.TextArea
          id="body"
          title="Request Body"
          placeholder='{ "key": "value", "nested": { "id": 123 } }'
          info="Enter the request body (e.g., JSON)."
          value={body} // Bind to state
          error={bodyError}
          onChange={(newValue) => {
              setBody(newValue); // Update state
              if (bodyError) setBodyError(undefined); // Clear error on change
          }}
        />
      )}
    </Form>
  );
}

// Separate component for the Save action, receives state values as props
interface ActionSaveCommandProps {
    method: string;
    webhookBaseUrl: string;
    headers: string;
    queryParams: string;
    body: string;
    showBodyField: boolean;
}

function ActionSaveCommand(props: ActionSaveCommandProps) {
  const { method, webhookBaseUrl, headers, queryParams, body, showBodyField } = props;
  const { push } = useNavigation(); // Need push here

  return (
    <Action
      title="Save as Command..."
      icon={Icon.HardDrive} // Use HardDrive icon
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={() => {
        // Construct the final URL using passed props
        const finalUrl = queryParams ? `${webhookBaseUrl}?${queryParams}` : webhookBaseUrl;

        console.log("ActionSaveCommand: Pushing SaveCommandForm"); // Add log here
        push(
          <SaveCommandForm
            method={method}
            url={finalUrl}
            headers={headers}
            queryParams={queryParams}
            // Only pass body if it was relevant for the method
            body={showBodyField ? body : undefined}
          />
        );
      }}
    />
  );
}