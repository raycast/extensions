import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";
import axios from "axios";

type AuthType = "none" | "bearer" | "basic" | "apiKey";

export default function HttpTester() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [bearerToken, setBearerToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiValue, setApiValue] = useState("");
  const [apiKeyLocation, setApiKeyLocation] = useState<"header" | "query">("header");

  const sendRequest = async () => {
    try {
      const headersObj = headers.split("\n").reduce((acc: { [key: string]: string }, line) => {
        const [key, value] = line.split(":").map((s) => s.trim());
        if (key && value) acc[key] = value;
        return acc;
      }, {});

      switch (authType) {
        case "bearer":
          headersObj["Authorization"] = `Bearer ${bearerToken}`;
          break;
        case "basic":
          headersObj["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
          break;
        case "apiKey":
          if (apiKeyLocation === "header") {
            headersObj[apiKey] = apiValue;
          }
          break;
      }

      const config: Record<string, unknown> = {
        method,
        url,
        headers: headersObj,
        data: body.trim() ? JSON.parse(body) : undefined,
      };

      if (authType === "apiKey" && apiKeyLocation === "query") {
        config.params = { ...(config.params || {}), [apiKey]: apiValue };
      }

      const startTime = Date.now();
      const res = await axios(config);
      const duration = Date.now() - startTime;

      setResponse(`Status: ${res.status} ${res.statusText}
Time: ${duration}ms
Headers: ${JSON.stringify(res.headers, null, 2)}
Body: ${JSON.stringify(res.data, null, 2)}`);

      showToast({ style: Toast.Style.Success, title: "Request successful" });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setResponse(`Error: ${error.message}
${
  error.response
    ? `Status: ${error.response.status}
Body: ${JSON.stringify(error.response.data)}`
    : ""
}`);
      } else {
        setResponse(`Error: ${String(error)}`);
      }
      showToast({ style: Toast.Style.Failure, title: "Request failed" });
    }
  };

  const handleCopyResponse = () => {
    Clipboard.copy(response);
    showToast({ style: Toast.Style.Success, title: "Copied response to clipboard!" });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Request" onSubmit={sendRequest} />
          {response && (
            <>
              <Action title="Copy Response" onAction={handleCopyResponse} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <Action
                title="Copy Response Body"
                onAction={() => {
                  const body = response.split("Body: ")[1];
                  Clipboard.copy(body);
                  showToast({ style: Toast.Style.Success, title: "Copied body to clipboard!" });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              />
              <Action
                title="Copy Response Headers"
                onAction={() => {
                  const headers = response.split("Headers: ")[1].split("\nBody:")[0];
                  Clipboard.copy(headers);
                  showToast({ style: Toast.Style.Success, title: "Copied headers to clipboard!" });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} />

      <Form.Dropdown id="method" title="Method" value={method} onChange={setMethod}>
        {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={m} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="authType"
        title="Authentication Type"
        value={authType}
        onChange={(value) => setAuthType(value as AuthType)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="bearer" title="Bearer Token" />
        <Form.Dropdown.Item value="basic" title="Basic Auth" />
        <Form.Dropdown.Item value="apiKey" title="API Key" />
      </Form.Dropdown>

      {authType === "bearer" && (
        <Form.PasswordField id="bearerToken" title="Bearer Token" value={bearerToken} onChange={setBearerToken} />
      )}

      {authType === "basic" && (
        <>
          <Form.TextField id="username" title="Username" value={username} onChange={setUsername} />
          <Form.PasswordField id="password" title="Password" value={password} onChange={setPassword} />
        </>
      )}

      {authType === "apiKey" && (
        <>
          <Form.TextField
            id="apiKey"
            title="API Key Name"
            placeholder="X-API-Key"
            value={apiKey}
            onChange={setApiKey}
          />
          <Form.PasswordField id="apiValue" title="API Key Value" value={apiValue} onChange={setApiValue} />
          <Form.Dropdown
            id="apiKeyLocation"
            title="Key Location"
            value={apiKeyLocation}
            onChange={(value) => setApiKeyLocation(value as "header" | "query")}
          >
            <Form.Dropdown.Item value="header" title="Header" />
            <Form.Dropdown.Item value="query" title="Query Parameter" />
          </Form.Dropdown>
        </>
      )}

      <Form.Separator />

      <Form.TextArea
        id="headers"
        title="Additional Headers (key: value)"
        placeholder="Content-Type: application/json"
        value={headers}
        onChange={setHeaders}
      />

      <Form.TextArea id="body" title="Request Body" enableMarkdown={false} value={body} onChange={setBody} />

      {response && <Form.TextArea id="response" title="Response" value={response} />}
    </Form>
  );
}
