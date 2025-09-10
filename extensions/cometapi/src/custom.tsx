import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { getApiKey } from "./api";

export default function Command() {
  const { push, pop } = useNavigation();
  const [endpoint, setEndpoint] = useState("chat/completions");
  const [method, setMethod] = useState("POST");
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(
      {
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello!" },
        ],
      },
      null,
      2,
    ),
  );

  async function onSubmit(values: {
    endpoint: string;
    method: string;
    requestBody: string;
  }) {
    const trimmedEndpoint = values.endpoint?.trim();
    const trimmedMethod = values.method?.trim() || "POST";
    const trimmedBody = values.requestBody?.trim();

    if (!trimmedEndpoint) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Endpoint required",
      });
      return;
    }

    const fullUrl = `https://api.cometapi.com/v1/${trimmedEndpoint}`;
    push(
      <Detail
        isLoading
        markdown={`Making ${trimmedMethod} request to ${fullUrl}...`}
      />,
    );

    try {
      const apiKey = getApiKey();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      const options: RequestInit = {
        method: trimmedMethod,
        headers,
      };

      if (trimmedMethod !== "GET" && trimmedBody) {
        // Validate JSON
        try {
          JSON.parse(trimmedBody);
          options.body = trimmedBody;
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid JSON",
            message:
              e instanceof Error
                ? e.message
                : "Request body must be valid JSON",
          });
          pop();
          return;
        }
      }

      const response = await fetch(fullUrl, options);
      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const statusInfo = `**Status:** ${response.status} ${response.statusText}`;
      const responseContent =
        typeof responseData === "string"
          ? responseData
          : JSON.stringify(responseData, null, 2);

      push(
        <Detail
          markdown={`# API Response\n\n${statusInfo}\n\n## Response Body\n\n\`\`\`json\n${responseContent}\n\`\`\``}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Response"
                content={responseContent}
              />
              <Action.CopyToClipboard title="Copy URL" content={fullUrl} />
              <Action
                title="Back"
                icon={Icon.ArrowLeft}
                onAction={() => pop()}
              />
            </ActionPanel>
          }
        />,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Request failed",
        message: msg,
      });
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Request" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="endpoint"
        title="API Endpoint"
        placeholder="chat/completions"
        value={endpoint}
        onChange={setEndpoint}
        info="Endpoint path (without https://api.cometapi.com/v1/ prefix)"
      />

      <Form.Dropdown
        id="method"
        title="HTTP Method"
        value={method}
        onChange={setMethod}
      >
        <Form.Dropdown.Item value="POST" title="POST" />
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="PUT" title="PUT" />
        <Form.Dropdown.Item value="DELETE" title="DELETE" />
      </Form.Dropdown>

      <Form.TextArea
        id="requestBody"
        title="Request Body (JSON)"
        placeholder="Request body in JSON format"
        value={requestBody}
        onChange={setRequestBody}
        info="Only used for non-GET requests. Must be valid JSON."
      />

      <Form.Separator />

      <Form.Description
        title="Common Endpoints"
        text="• chat/completions - OpenAI compatible chat
• responses - CometAPI responses endpoint
• models - List available models"
      />
    </Form>
  );
}
