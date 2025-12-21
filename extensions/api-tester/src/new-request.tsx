import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  useNavigation,
  Icon,
  Color,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import React, { useState } from "react";
import {
  ApiRequest,
  ApiResponse,
  HttpMethod,
  AuthType,
  BodyType,
  KeyValue,
} from "./types";
import { sendRequest } from "./api";
import {
  generateId,
  formatTime,
  formatBytes,
  getStatusColor,
  formatJSON,
} from "./utils";
import { addToHistory } from "./storage";
import { generateCurl, generateFetch, generateAxios } from "./codegen";

interface Preferences {
  requestTimeout: string;
  maxHistoryItems: string;
}

export default function NewRequest() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [bodyType, setBodyType] = useState<BodyType>("none");
  const [isLoading, setIsLoading] = useState(false);

  const { push } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    setIsLoading(true);

    try {
      // Build headers
      const headers: KeyValue[] = [];
      for (let i = 0; i < 10; i++) {
        const key = values[`header_key_${i}`];
        const value = values[`header_value_${i}`];
        if (key) {
          headers.push({
            id: generateId(),
            key,
            value: value || "",
            enabled: values[`header_enabled_${i}`] !== false,
          });
        }
      }

      // Build query params
      const queryParams: KeyValue[] = [];
      for (let i = 0; i < 10; i++) {
        const key = values[`param_key_${i}`];
        const value = values[`param_value_${i}`];
        if (key) {
          queryParams.push({
            id: generateId(),
            key,
            value: value || "",
            enabled: values[`param_enabled_${i}`] !== false,
          });
        }
      }

      // Build auth config
      const auth: ApiRequest["auth"] = { type: authType };
      if (authType === "bearer") {
        auth.bearer = { token: (values.bearer_token as string) || "" };
      } else if (authType === "apikey") {
        auth.apikey = {
          key: (values.apikey_key as string) || "",
          value: (values.apikey_value as string) || "",
          addTo: (values.apikey_addto as "header" | "query") || "header",
        };
      } else if (authType === "basic") {
        auth.basic = {
          username: (values.basic_username as string) || "",
          password: (values.basic_password as string) || "",
        };
      }

      // Build body
      const body: ApiRequest["body"] = { type: bodyType };
      if (bodyType === "json") {
        body.json = values.body_json || "";
      } else if (bodyType === "raw") {
        body.raw = values.body_raw || "";
      } else if (bodyType === "form-data") {
        const formData: KeyValue[] = [];
        for (let i = 0; i < 10; i++) {
          const key = values[`formdata_key_${i}`];
          const fieldType = values[`formdata_type_${i}`] || "text";
          const value = values[`formdata_value_${i}`];
          const filePicker = values[`formdata_file_${i}`];

          if (key) {
            const field: KeyValue = {
              id: generateId(),
              key,
              value: value || "",
              enabled: values[`formdata_enabled_${i}`] !== false,
              type: fieldType,
            };

            // If file type and file picker has selection, use that
            if (fieldType === "file" && filePicker && filePicker.length > 0) {
              field.filePath = filePicker[0];
            }

            formData.push(field);
          }
        }
        body.formData = formData;
      } else if (bodyType === "x-www-form-urlencoded") {
        const urlEncoded: KeyValue[] = [];
        for (let i = 0; i < 10; i++) {
          const key = values[`urlencoded_key_${i}`];
          const value = values[`urlencoded_value_${i}`];
          if (key) {
            urlEncoded.push({
              id: generateId(),
              key,
              value: value || "",
              enabled: values[`urlencoded_enabled_${i}`] !== false,
            });
          }
        }
        body.urlEncoded = urlEncoded;
      }

      const request: ApiRequest = {
        id: generateId(),
        name: values.request_name || "Untitled Request",
        method,
        url: values.url,
        headers,
        queryParams,
        auth,
        body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const preferences = getPreferenceValues<Preferences>();
      const timeout = parseInt(preferences.requestTimeout) || 30000;

      const response = await sendRequest(request, timeout);

      // Add to history
      const maxHistoryItems = parseInt(preferences.maxHistoryItems) || 50;
      await addToHistory(
        {
          id: generateId(),
          request,
          response,
          timestamp: new Date().toISOString(),
        },
        maxHistoryItems,
      );

      // Show response
      push(<ResponseView request={request} response={response} />);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Request Failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Request"
            onSubmit={handleSubmit}
            icon={Icon.Airplane}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="request_name"
        title="Request Name"
        placeholder="My API Request"
      />

      <Form.Dropdown
        id="method"
        title="Method"
        value={method}
        onChange={(value) => setMethod(value as HttpMethod)}
      >
        <Form.Dropdown.Item
          value="GET"
          title="GET"
          icon={{ source: Icon.Download, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value="POST"
          title="POST"
          icon={{ source: Icon.Upload, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          value="PUT"
          title="PUT"
          icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          value="DELETE"
          title="DELETE"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
        />
        <Form.Dropdown.Item
          value="PATCH"
          title="PATCH"
          icon={{ source: Icon.Pencil, tintColor: Color.Purple }}
        />
      </Form.Dropdown>

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://api.example.com/endpoint"
        value={url}
        onChange={setUrl}
      />

      <Form.Separator />

      {/* Query Parameters */}
      <Form.Description text="Query Parameters" />
      {[0, 1, 2].map((i) => [
        <Form.TextField
          key={`param_key_${i}`}
          id={`param_key_${i}`}
          title={`Key ${i + 1}`}
          placeholder="license_key"
        />,
        <Form.TextField
          key={`param_value_${i}`}
          id={`param_value_${i}`}
          title={`Value ${i + 1}`}
          placeholder="your-value-here"
        />,
      ])}

      <Form.Separator />

      {/* Headers */}
      <Form.Description text="Headers" />
      {[0, 1, 2].map((i) => (
        <Form.TextField
          key={`header_${i}`}
          id={`header_key_${i}`}
          title={`Header ${i + 1}`}
          placeholder="Content-Type"
        />
      ))}

      <Form.Separator />

      {/* Authentication */}
      <Form.Dropdown
        id="auth_type"
        title="Authentication"
        value={authType}
        onChange={(value) => setAuthType(value as AuthType)}
      >
        <Form.Dropdown.Item value="none" title="No Auth" />
        <Form.Dropdown.Item value="bearer" title="Bearer Token" />
        <Form.Dropdown.Item value="apikey" title="API Key" />
        <Form.Dropdown.Item value="basic" title="Basic Auth" />
      </Form.Dropdown>

      {authType === "bearer" && (
        <Form.TextField
          id="bearer_token"
          title="Token"
          placeholder="your-token-here"
        />
      )}

      {authType === "apikey" && (
        <>
          <Form.TextField id="apikey_key" title="Key" placeholder="X-API-Key" />
          <Form.TextField
            id="apikey_value"
            title="Value"
            placeholder="your-api-key"
          />
          <Form.Dropdown id="apikey_addto" title="Add To" defaultValue="header">
            <Form.Dropdown.Item value="header" title="Header" />
            <Form.Dropdown.Item value="query" title="Query Params" />
          </Form.Dropdown>
        </>
      )}

      {authType === "basic" && (
        <>
          <Form.TextField
            id="basic_username"
            title="Username"
            placeholder="username"
          />
          <Form.PasswordField
            id="basic_password"
            title="Password"
            placeholder="password"
          />
        </>
      )}

      <Form.Separator />

      {/* Body */}
      {method !== "GET" && (
        <>
          <Form.Dropdown
            id="body_type"
            title="Body Type"
            value={bodyType}
            onChange={(value) => setBodyType(value as BodyType)}
          >
            <Form.Dropdown.Item value="none" title="None" />
            <Form.Dropdown.Item value="json" title="JSON" />
            <Form.Dropdown.Item value="form-data" title="Form Data" />
            <Form.Dropdown.Item
              value="x-www-form-urlencoded"
              title="URL Encoded"
            />
            <Form.Dropdown.Item value="raw" title="Raw" />
          </Form.Dropdown>

          {bodyType === "json" && (
            <Form.TextArea
              id="body_json"
              title="JSON Body"
              placeholder='{\n  "key": "value"\n}'
              enableMarkdown={false}
            />
          )}

          {bodyType === "form-data" && (
            <>
              <Form.Description text="Form Data (multipart/form-data)" />
              {[0, 1, 2, 3, 4].map((i) => [
                <Form.TextField
                  key={`formdata_key_${i}`}
                  id={`formdata_key_${i}`}
                  title={`Key ${i + 1}`}
                  placeholder="field_name"
                />,
                <Form.Dropdown
                  key={`formdata_type_${i}`}
                  id={`formdata_type_${i}`}
                  title={`Type ${i + 1}`}
                  defaultValue="text"
                >
                  <Form.Dropdown.Item
                    value="text"
                    title="Text"
                    icon={Icon.Text}
                  />
                  <Form.Dropdown.Item
                    value="file"
                    title="File"
                    icon={Icon.Document}
                  />
                </Form.Dropdown>,
                <Form.TextField
                  key={`formdata_value_${i}`}
                  id={`formdata_value_${i}`}
                  title={`Value ${i + 1}`}
                  placeholder="text or file path"
                />,
                <Form.FilePicker
                  key={`formdata_file_${i}`}
                  id={`formdata_file_${i}`}
                  title={`Or Pick File ${i + 1}`}
                  allowMultipleSelection={false}
                  canChooseDirectories={false}
                />,
              ])}
            </>
          )}

          {bodyType === "x-www-form-urlencoded" && (
            <>
              <Form.Description text="URL Encoded Form Data" />
              {[0, 1, 2, 3, 4].map((i) => [
                <Form.TextField
                  key={`urlencoded_key_${i}`}
                  id={`urlencoded_key_${i}`}
                  title={`Key ${i + 1}`}
                  placeholder="field_name"
                />,
                <Form.TextField
                  key={`urlencoded_value_${i}`}
                  id={`urlencoded_value_${i}`}
                  title={`Value ${i + 1}`}
                  placeholder="field_value"
                />,
              ])}
            </>
          )}

          {bodyType === "raw" && (
            <Form.TextArea
              id="body_raw"
              title="Raw Body"
              placeholder="Raw text content"
              enableMarkdown={false}
            />
          )}
        </>
      )}
    </Form>
  );
}

function ResponseView({
  request,
  response,
}: {
  request: ApiRequest;
  response: ApiResponse;
}) {
  const [selectedTab, setSelectedTab] = useState<"body" | "headers">("body");

  const statusColor = getStatusColor(response.status);
  const formattedBody = formatJSON(response.body);

  const markdown = `
# ${statusColor} ${response.status} ${response.statusText}

**${request.method}** \`${response.actualUrl}\`

---

## Response Info

- ⏱️ **Time**: ${formatTime(response.responseTime)}
- 📦 **Size**: ${formatBytes(response.size)}

---

## ${selectedTab === "body" ? "Response Body" : "Response Headers"}

${
  selectedTab === "body"
    ? `\`\`\`json\n${formattedBody}\n\`\`\``
    : Object.entries(response.headers)
        .map(([key, value]) => `- **${key}**: ${value}`)
        .join("\n")
}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={selectedTab === "body" ? "Show Headers" : "Show Body"}
            onAction={() =>
              setSelectedTab(selectedTab === "body" ? "headers" : "body")
            }
            icon={Icon.Eye}
          />
          <Action
            title="Copy Response Body"
            onAction={async () => {
              await Clipboard.copy(response.body);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied to Clipboard",
              });
            }}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Copy Formatted JSON"
            onAction={async () => {
              await Clipboard.copy(formattedBody);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied Formatted JSON",
              });
            }}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <ActionPanel.Submenu
            title="Copy as Code"
            icon={Icon.CodeBlock}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          >
            <Action
              title="Copy as Curl"
              onAction={async () => {
                const code = generateCurl(request);
                await Clipboard.copy(code);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied cURL Command",
                });
              }}
              icon={Icon.Terminal}
            />
            <Action
              title="Copy as Fetch"
              onAction={async () => {
                const code = generateFetch(request);
                await Clipboard.copy(code);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied fetch Code",
                });
              }}
              icon={Icon.Code}
            />
            <Action
              title="Copy as Axios"
              onAction={async () => {
                const code = generateAxios(request);
                await Clipboard.copy(code);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied axios Code",
                });
              }}
              icon={Icon.Code}
            />
          </ActionPanel.Submenu>
          <Action
            title="Save to Collection"
            onAction={async () => {
              await showToast({
                style: Toast.Style.Success,
                title: "Feature Coming Soon",
              });
            }}
            icon={Icon.SaveDocument}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={`${statusColor} ${response.status} ${response.statusText}`}
          />
          <Detail.Metadata.Label
            title="Time"
            text={formatTime(response.responseTime)}
          />
          <Detail.Metadata.Label
            title="Size"
            text={formatBytes(response.size)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Method" text={request.method} />
          <Detail.Metadata.Label title="URL" text={response.actualUrl} />
          {request.url !== response.actualUrl && (
            <Detail.Metadata.Label title="Template" text={request.url} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
