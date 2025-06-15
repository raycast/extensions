import React, { useState, useEffect } from "react";
import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";

interface JWTPayload {
  [key: string]: unknown;
}

function decodeJWT(token: string): { header: JWTPayload; payload: JWTPayload } | null {
  try {
    const [headerB64, payloadB64] = token.split(".");
    const header = JSON.parse(atob(headerB64.padEnd(headerB64.length + ((4 - (headerB64.length % 4)) % 4), "=")));
    const payload = JSON.parse(atob(payloadB64.padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), "=")));
    return { header, payload };
  } catch (error) {
    showFailureToast(error, { title: "Invalid JWT" });
    return null;
  }
}

export default function Command() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<{ header: JWTPayload; payload: JWTPayload } | null>(null);

  useEffect(() => {
    if (!token) {
      setDecoded(null);
      return;
    }

    const result = decodeJWT(token);
    if (result) {
      setDecoded(result);
    }
  }, [token]);

  const handleDecode = () => {
    if (!token) {
      setDecoded(null);
      return;
    }

    const result = decodeJWT(token);
    if (result) {
      setDecoded(result);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Decode JWT" onAction={handleDecode} shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} />
          {decoded && (
            <>
              <Action.CopyToClipboard title="Copy Header" content={JSON.stringify(decoded.header, null, 2)} />
              <Action.CopyToClipboard title="Copy Payload" content={JSON.stringify(decoded.payload, null, 2)} />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="JWT Input" placeholder="Paste JWT here" value={token} onChange={setToken} />
      {decoded && (
        <>
          <Form.TextArea
            id="header"
            title="Header"
            value={JSON.stringify(decoded.header, null, 2)}
            onChange={() => {}}
            placeholder="Decoded header will appear here"
            enableMarkdown={false}
            autoFocus={false}
          />
          <Form.TextArea
            id="payload"
            title="Payload"
            value={JSON.stringify(decoded.payload, null, 2)}
            onChange={() => {}}
            placeholder="Decoded payload will appear here"
            enableMarkdown={false}
            autoFocus={false}
          />
        </>
      )}
    </Form>
  );
}
