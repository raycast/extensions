import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Color, Form, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import jwt, { JwtPayload } from "jsonwebtoken";

interface JWTFormValues {
  token: string;
  secret: string;
}

interface DecodedJWT {
  header: Record<string, unknown>;
  payload: JwtPayload;
  signature: string;
  isValid?: boolean;
}

interface FormProps {
  handleSubmit: (values: JWTFormValues) => void;
  itemProps: {
    token: Record<string, unknown>;
    secret: Record<string, unknown>;
  };
  focus: () => void;
  reset: () => void;
  setValue: (id: string, value: string) => void;
}

export default function JwtParser() {
  const [isLoading, setIsLoading] = useState(true);
  const [clipboardText, setClipboardText] = useState("");
  const [decodedJWT, setDecodedJWT] = useState<DecodedJWT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "detail">("form");
  const [formValues, setFormValues] = useState<JWTFormValues>({
    token: "",
    secret: "",
  });
  const [tokenError, setTokenError] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<"all" | "header" | "payload">("all");

  // Custom form handling since useForm is not available
  const formProps: FormProps = {
    handleSubmit: (values: JWTFormValues) => {
      if (!values.token) {
        setTokenError("JWT token is required");
        return;
      }

      try {
        const decoded = decodeJwt(values.token);

        if (values.secret) {
          try {
            jwt.verify(values.token, values.secret);
            decoded.isValid = true;
          } catch {
            decoded.isValid = false;
          }
        }

        setDecodedJWT(decoded);
        setError(null);
        setTokenError(undefined);
        setView("detail");
      } catch {
        setError("Invalid JWT token format");
        setDecodedJWT(null);
      }
    },
    itemProps: {
      token: {
        value: formValues.token,
        onChange: (value: string) => setFormValues((prev) => ({ ...prev, token: value })),
        error: tokenError,
      },
      secret: {
        value: formValues.secret,
        onChange: (value: string) => setFormValues((prev) => ({ ...prev, secret: value })),
      },
    },
    focus: () => {
      // This is a placeholder since we can't actually focus fields
    },
    reset: () => {
      setFormValues({ token: "", secret: "" });
      setDecodedJWT(null);
      setError(null);
      setTokenError(undefined);
    },
    setValue: (id: string, value: string) => {
      if (id === "token") {
        setFormValues((prev) => ({ ...prev, token: value }));
        if (!value || value === "") {
          setTokenError("JWT token is required");
        } else {
          setTokenError(undefined);
        }
      } else if (id === "secret") {
        setFormValues((prev) => ({ ...prev, secret: value }));
      }
    },
  };

  useEffect(() => {
    async function fetchClipboardText() {
      setIsLoading(true);
      try {
        const text = await Clipboard.read();

        // Convert clipboard content to string and validate it's not empty
        if (text && text.text) {
          const clipboardStr = String(text.text).trim();

          // Check if this looks like a JWT token (has two dots)
          if (clipboardStr.length > 0 && clipboardStr.split(".").length === 3) {
            setClipboardText(clipboardStr);
            formProps.setValue("token", clipboardStr);
          } else {
            setClipboardText(clipboardStr);
          }
        }
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to read clipboard",
          message: "Please make sure you have clipboard permissions enabled",
        });
        setClipboardText("");
      } finally {
        setIsLoading(false);
      }
    }

    fetchClipboardText();
  }, []);

  function decodeJwt(token: string): DecodedJWT {
    const [headerB64, payloadB64, signature] = token.split(".");

    if (!headerB64 || !payloadB64 || !signature) {
      throw new Error("Invalid JWT token format");
    }

    try {
      const header = JSON.parse(base64UrlDecode(headerB64));
      const payload = JSON.parse(base64UrlDecode(payloadB64));

      return {
        header,
        payload,
        signature,
      };
    } catch {
      throw new Error("Invalid JWT token format");
    }
  }

  function base64UrlDecode(str: string): string {
    try {
      // Convert Base64URL to Base64
      str = str.replace(/-/g, "+").replace(/_/g, "/");

      // Add padding if needed
      while (str.length % 4) {
        str += "=";
      }

      return Buffer.from(str, "base64").toString("utf8");
    } catch {
      throw new Error("Invalid Base64URL encoding");
    }
  }

  function colorizeValue(value: unknown): string {
    if (typeof value === "string") {
      return `<span style="color: #10B981;">"${value}"</span>`;
    } else if (typeof value === "number") {
      return `<span style="color: #3B82F6;">${value}</span>`;
    } else if (typeof value === "boolean") {
      return `<span style="color: #EC4899;">${value}</span>`;
    } else if (value === null) {
      return `<span style="color: #6B7280;">null</span>`;
    } else if (Array.isArray(value)) {
      const items = value.map((item) => colorizeValue(item)).join(", ");
      return `<span style="color: #6B7280;">[</span>${items}<span style="color: #6B7280;">]</span>`;
    } else if (typeof value === "object") {
      return formatJson(value as Record<string, unknown>);
    }
    return String(value);
  }

  function formatJson(obj: Record<string, unknown>, indent = 2): string {
    let result = `<span style="color: #6B7280;">{</span>\n`;

    for (const [key, value] of Object.entries(obj)) {
      const spaces = " ".repeat(indent);
      result += `${spaces}<span style="color: #F59E0B;">"${key}"</span>: ${colorizeValue(value)},\n`;
    }

    result += `<span style="color: #6B7280;">}</span>`;
    return result;
  }

  function formatTimestamp(timestamp: number): string {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    } catch {
      return "Invalid Date";
    }
  }

  function renderJwtData() {
    if (!decodedJWT) return null;

    // Create dates for special timestamp fields
    const formattedPayload = { ...decodedJWT.payload };
    for (const field of ["exp", "iat", "nbf"]) {
      if (typeof formattedPayload[field] === "number") {
        formattedPayload[field] = `${formattedPayload[field]} (${formatTimestamp(formattedPayload[field] as number)})`;
      }
    }

    // Create sections for different parts of the token
    const sections = [
      {
        title: "Header",
        content: formatJson(decodedJWT.header),
        icon: { source: Icon.Terminal, tintColor: Color.Blue },
      },
      {
        title: "Payload",
        content: formatJson(formattedPayload),
        icon: { source: Icon.Box, tintColor: Color.Green },
      },
      {
        title: "Signature",
        content: `<span style="color: #E11D48; word-break: break-all;">${decodedJWT.signature}</span>`,
        icon: { source: Icon.Key, tintColor: Color.Red },
      },
    ];

    // Add verification status if secret was provided
    if (decodedJWT.isValid !== undefined) {
      sections.push({
        title: "Verification",
        content: decodedJWT.isValid
          ? `<span style="color: #10B981; font-size: 16px;">✓ Signature is valid</span>`
          : `<span style="color: #EF4444; font-size: 16px;">✗ Invalid signature</span>`,
        icon: {
          source: decodedJWT.isValid ? Icon.CheckCircle : Icon.XmarkCircle,
          tintColor: decodedJWT.isValid ? Color.Green : Color.Red,
        },
      });
    }

    // Generate markdown
    let markdown = `# JWT Token Details\n\n`;

    for (const section of sections) {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
    }

    return markdown;
  }

  if (view === "detail" && decodedJWT) {
    return (
      <List
        navigationTitle="JWT Token Details"
        isLoading={isLoading}
        searchBarPlaceholder="Search token claims..."
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter by section"
            value={filter}
            onChange={(value) => setFilter(value as "all" | "header" | "payload")}
            storeValue={true}
          >
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Header" value="header" />
            <List.Dropdown.Item title="Payload" value="payload" />
          </List.Dropdown>
        }
      >
        <List.Section title="Token Header" subtitle={`Algorithm: ${decodedJWT.header.alg || "none"}`}>
          {Object.entries(decodedJWT.header).map(([key, value]) => (
            <List.Item
              key={`header-${key}`}
              title={key}
              accessories={[{ text: JSON.stringify(value) }]}
              icon={{ source: Icon.Terminal, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy to Clipboard" content={JSON.stringify(value)} />
                  <Action
                    title="Back to Form"
                    onAction={() => setView("form")}
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>

        <List.Section title="Token Payload" subtitle="Claims and data">
          {Object.entries(decodedJWT.payload).map(([key, value]) => {
            // Format special timestamp fields
            let displayText = JSON.stringify(value);
            let icon = { source: Icon.Box, tintColor: Color.Green };

            // Special icons for common claim types
            if (["exp", "iat", "nbf"].includes(key) && typeof value === "number") {
              const date = formatTimestamp(value as number);
              displayText = `${value} (${date})`;
              icon = { source: Icon.Calendar, tintColor: Color.Orange };
            } else if (key === "sub") {
              icon = { source: Icon.Person, tintColor: Color.Purple };
            } else if (key === "iss") {
              icon = { source: Icon.Globe, tintColor: Color.Blue };
            } else if (key === "aud") {
              icon = { source: Icon.Eye, tintColor: Color.Magenta };
            }

            return (
              <List.Item
                key={`payload-${key}`}
                title={key}
                subtitle={key === "sub" ? (value as string) : undefined}
                accessories={[{ text: displayText }]}
                icon={icon}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy to Clipboard" content={JSON.stringify(value)} />
                    <Action
                      title="Back to Form"
                      onAction={() => setView("form")}
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>

        <List.Section title="Signature and Verification">
          <List.Item
            title="Signature"
            accessories={[
              {
                text:
                  decodedJWT.signature.length > 20
                    ? `${decodedJWT.signature.substring(0, 20)}...`
                    : decodedJWT.signature,
              },
            ]}
            icon={{ source: Icon.Key, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to Clipboard" content={decodedJWT.signature} />
                <Action
                  title="Back to Form"
                  onAction={() => setView("form")}
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />

          {decodedJWT.isValid !== undefined && (
            <List.Item
              title="Verification"
              accessories={[{ text: decodedJWT.isValid ? "Signature is valid" : "Invalid signature" }]}
              icon={{
                source: decodedJWT.isValid ? Icon.CheckCircle : Icon.XmarkCircle,
                tintColor: decodedJWT.isValid ? Color.Green : Color.Red,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Back to Form"
                    onAction={() => setView("form")}
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      </List>
    );
  }

  // Form view with enhanced visuals
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="JWT Token Parser"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => formProps.handleSubmit(formValues)}
            title="Parse Jwt"
            icon={Icon.MagnifyingGlass}
          />
          {clipboardText && (
            <Action
              title="Use Clipboard Content"
              onAction={() => {
                formProps.setValue("token", clipboardText);
              }}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          )}
          <Action
            title="Clear Form"
            onAction={formProps.reset}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {decodedJWT && (
            <Action.CopyToClipboard
              title="Copy Payload"
              content={JSON.stringify(decodedJWT.payload, null, 2)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title={
          clipboardText && clipboardText.split(".").length === 3
            ? "Token found in Clipboard"
            : clipboardText
              ? "No token in Clipboard"
              : "JWT Parser"
        }
        text={
          clipboardText && clipboardText.split(".").length === 3
            ? "A JWT token was found in your clipboard!"
            : clipboardText
              ? "The clipboard content is not a valid JWT token."
              : "Paste your token below, or use the sample token to see how it works."
        }
      />

      <Form.TextArea
        id="token"
        title="JWT Token"
        placeholder="Paste your JWT token here..."
        value={formValues.token}
        onChange={(value) => formProps.setValue("token", value)}
        error={tokenError}
        enableMarkdown={false}
        info={
          formValues.token ? `Characters: ${formValues.token.length}` : "Paste a JWT token (header.payload.signature)"
        }
      />

      <Form.Separator />

      <Form.TextField
        id="secret"
        title="Secret (optional)"
        placeholder="Enter secret to verify signature"
        value={formValues.secret}
        onChange={(value) => formProps.setValue("secret", value)}
        info="Provide the secret to validate the token's signature"
      />

      {error && <Form.Description title="Error" text={error} />}

      {decodedJWT && !view.startsWith("detail") && (
        <Form.Description title="Decoded Token" text={renderJwtData() || ""} />
      )}
    </Form>
  );
}
