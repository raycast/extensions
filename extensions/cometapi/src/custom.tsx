import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import { getApiKey } from "./api";

interface FormValues {
  endpoint: string;
  method: string;
  requestBody: string;
}

type ViewState = "form" | "loading" | "result";

export default function Command() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<string>("");
  const [fullUrl, setFullUrl] = useState<string>("");

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
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

      // Validate JSON for non-GET requests
      if (trimmedMethod !== "GET" && trimmedBody) {
        try {
          JSON.parse(trimmedBody);
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid JSON",
            message:
              e instanceof Error
                ? e.message
                : "Request body must be valid JSON",
          });
          return;
        }
      }

      const url = `https://api.cometapi.com/v1/${trimmedEndpoint}`;
      setFullUrl(url);

      // Set loading state
      setViewState("loading");

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
          options.body = trimmedBody;
        }

        const response = await fetch(url, options);
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

        const formattedResult = `# API Response\n\n${statusInfo}\n\n## Response Body\n\n\`\`\`json\n${responseContent}\n\`\`\``;

        // Set result state
        setResult(formattedResult);
        setViewState("result");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await showToast({
          style: Toast.Style.Failure,
          title: "Request failed",
          message: msg,
        });
        // Go back to form on error
        setViewState("form");
      }
    },
    initialValues: {
      endpoint: "chat/completions",
      method: "POST",
      requestBody: JSON.stringify(
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
    },
    validation: {
      endpoint: FormValidation.Required,
      requestBody: (value) => {
        // For now, we'll do basic JSON validation if the field has content
        // The method-specific validation will be handled in onSubmit
        if (value?.trim()) {
          try {
            JSON.parse(value);
          } catch {
            return "Request body must be valid JSON";
          }
        }
      },
    },
  });

  // Loading view
  if (viewState === "loading") {
    return <Detail isLoading markdown="Sending request..." />;
  }

  // Result view
  if (viewState === "result") {
    return (
      <Detail
        markdown={result}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Response"
              content={result}
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={fullUrl}
              icon={Icon.Link}
            />
            <Action
              title="Back to Form"
              icon={Icon.ArrowLeft}
              onAction={() => setViewState("form")}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Form view (default)
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Request"
            icon={Icon.Bolt}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="API Endpoint"
        placeholder="chat/completions"
        info="Endpoint path (without https://api.cometapi.com/v1/ prefix)"
        {...itemProps.endpoint}
      />

      <Form.Dropdown title="HTTP Method" {...itemProps.method}>
        <Form.Dropdown.Item value="POST" title="POST" />
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="PUT" title="PUT" />
        <Form.Dropdown.Item value="DELETE" title="DELETE" />
      </Form.Dropdown>

      <Form.TextArea
        title="Request Body (JSON)"
        placeholder="Request body in JSON format"
        info="Only used for non-GET requests. Must be valid JSON."
        {...itemProps.requestBody}
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
