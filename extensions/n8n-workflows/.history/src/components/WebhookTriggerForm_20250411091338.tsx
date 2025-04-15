import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { triggerWebhook } from "../utils/n8n-api-utils";

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
  const { pop } = useNavigation();
  const [headersError, setHeadersError] = useState<string | undefined>();
  const [bodyError, setBodyError] = useState<string | undefined>();

  // Construct the base webhook URL
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  const webhookBaseUrl = `${baseUrl}/webhook/${path}`; // Assumes /webhook/ path prefix

  // Determine if body field should be shown
  const showBodyField = ["POST", "PUT", "PATCH"].includes(method.toUpperCase());

  async function handleSubmit(values: Form.Values) {
    setHeadersError(undefined);
    setBodyError(undefined);

    const headers = parseHeaders(values.headers);
    const queryParams = values.queryParams; // Keep as string
    let body = values.body;

    // Basic validation for JSON body if provided
    if (showBodyField && body) {
      try {
        JSON.parse(body);
      } catch (e) {
        setBodyError("Invalid JSON format");
        return; // Prevent submission
      }
    } else if (!showBodyField) {
        body = undefined; // Ensure body is undefined for GET/DELETE etc.
    }

    // Construct final URL with query params
    const finalUrl = queryParams ? `${webhookBaseUrl}?${queryParams}` : webhookBaseUrl;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending webhook..." });

    try {
      const result = await triggerWebhook(finalUrl, method, headers, body);

      if (result.ok) {
        toast.style = Toast.Style.Success;
        toast.title = "Webhook Sent Successfully";
        toast.message = `Status: ${result.status}. Response: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`; // Show snippet of response
        pop(); // Close form on success
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Webhook Request Failed";
        toast.message = `Status: ${result.status}. Response: ${result.body}`;
      }
    } catch (error) {
      // Toast is shown in triggerWebhook, but update title here
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
      />

      <Form.TextArea
        id="headers"
        title="Headers"
        placeholder="Header-Name: Value&#10;Authorization: Bearer your_token"
        info="One header per line, separated by a colon (:)."
        error={headersError}
        onChange={() => setHeadersError(undefined)} // Clear error on change
      />

      {showBodyField && (
        <Form.TextArea
          id="body"
          title="Request Body"
          placeholder='{ "key": "value", "nested": { "id": 123 } }'
          info="Enter the request body (e.g., JSON)."
          error={bodyError}
          onChange={() => setBodyError(undefined)} // Clear error on change
        />
      )}
    </Form>
  );
}