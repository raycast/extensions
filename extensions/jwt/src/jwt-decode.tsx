import { Form, ActionPanel, Action, showToast, Detail, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

// helper function to decode jwt
function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    // decode header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
    };
  } catch (error) {
    throw new Error("Failed to decode JWT: " + (error as Error).message);
  }
}

export default function Command() {
  const [token, setToken] = useState("");
  const [showDecoded, setShowDecoded] = useState(false);
  const [decodedToken, setDecodedToken] = useState(null);

  useEffect(() => {
    async function checkClipboard() {
      try {
        const text = await Clipboard.readText();
        if (text) {
          // attempt to decode - if successful, use the clipboard content
          const decoded = decodeJWT(text);
          setToken(text);
          setDecodedToken(decoded);
          setShowDecoded(true);
        }
      } catch (error) {
        // ignore any clipboard or decoding errors
      }
    }
    checkClipboard();
  }, []);

  async function handleSubmit() {
    try {
      const decoded = decodeJWT(token);
      setDecodedToken(decoded);
      setShowDecoded(true);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JWT token",
        message: (error as Error).message,
      });
    }
  }

  if (showDecoded && decodedToken) {
    const markdown = `
# Decoded JWT
## Header
\`\`\`json
${JSON.stringify(decodedToken.header, null, 2)}
\`\`\`
## Payload
\`\`\`json
${JSON.stringify(decodedToken.payload, null, 2)}
\`\`\`
## Signature
\`\`\`
${decodedToken.signature}
\`\`\`
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Decode Another Jwt"
                onAction={() => {
                  setShowDecoded(false);
                  setToken("");
                }}
              />
              <Action
                title="Copy Header"
                onAction={() => Clipboard.copy(JSON.stringify(decodedToken.header, null, 2))}
              />
              <Action
                title="Copy Payload"
                onAction={() => Clipboard.copy(JSON.stringify(decodedToken.payload, null, 2))}
              />
              <Action title="Copy Signature" onAction={() => Clipboard.copy(decodedToken.signature)} />
              <Action title="Copy Full Token" onAction={() => Clipboard.copy(token)} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode Jwt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="token" title="Token" placeholder="Enter JWT token" value={token} onChange={setToken} />
    </Form>
  );
}
