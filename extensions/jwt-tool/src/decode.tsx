import { ActionPanel, Action, Form, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useState } from "react";
import * as jwt from "jsonwebtoken";

export default function Command() {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [verify, setVerify] = useState(false);
  const [removePrefix, setRemovePrefix] = useState(true);
  const [decodedHeader, setDecodedHeader] = useState("");
  const [decodedPayload, setDecodedPayload] = useState("");
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [processedToken, setProcessedToken] = useState("");
  const [detectedPrefix, setDetectedPrefix] = useState("");

  function cleanToken(rawToken: string): { token: string; prefix: string } {
    const trimmed = rawToken.trim();

    // Common JWT token prefixes
    const prefixes = [
      { pattern: /^Bearer\s+/i, name: "Bearer" },
      { pattern: /^Token\s+/i, name: "Token" },
      { pattern: /^JWT\s+/i, name: "JWT" },
      { pattern: /^Basic\s+/i, name: "Basic" },
      { pattern: /^eyJ/i, name: "Raw JWT" }, // Standard JWT starts with "eyJ"
    ];

    for (const { pattern, name } of prefixes) {
      if (pattern.test(trimmed)) {
        const cleaned = trimmed.replace(pattern, "").trim();
        return { token: cleaned, prefix: name };
      }
    }

    return { token: trimmed, prefix: "Unknown" };
  }

  function handleDecode() {
    if (!token.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Token Required",
        message: "Please enter a JWT token to decode",
      });
      return;
    }

    try {
      let tokenToProcess = token;
      const cleaned = cleanToken(token);
      setDetectedPrefix(cleaned.prefix);

      if (removePrefix && cleaned.prefix !== "Raw JWT" && cleaned.prefix !== "Unknown") {
        tokenToProcess = cleaned.token;
        setProcessedToken(tokenToProcess);
      } else {
        setProcessedToken(tokenToProcess);
      }

      // First decode without verification to get header and payload
      const decoded = jwt.decode(tokenToProcess, { complete: true });

      if (!decoded) {
        throw new Error("Invalid JWT token format");
      }

      setDecodedHeader(JSON.stringify(decoded.header, null, 2));
      setDecodedPayload(JSON.stringify(decoded.payload, null, 2));

      // Verify if requested and secret is provided
      if (verify && secret) {
        try {
          jwt.verify(tokenToProcess, secret);
          setIsTokenValid(true);
          showToast({
            style: Toast.Style.Success,
            title: "Token Decoded & Verified",
            message: cleaned.prefix !== "Raw JWT" ? `Detected prefix: ${cleaned.prefix}` : "",
          });
        } catch (verifyError) {
          setIsTokenValid(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Token Decoded but Verification Failed",
            message: String(verifyError),
          });
        }
      } else {
        setIsTokenValid(null);
        showToast({
          style: Toast.Style.Success,
          title: "Token Decoded",
          message:
            verify && !secret
              ? "Verification skipped (no secret)"
              : cleaned.prefix !== "Raw JWT"
                ? `Detected prefix: ${cleaned.prefix}`
                : "",
        });
      }
    } catch (error) {
      setDecodedHeader("");
      setDecodedPayload("");
      setIsTokenValid(null);
      setProcessedToken("");
      setDetectedPrefix("");
      showToast({
        style: Toast.Style.Failure,
        title: "Decoding Failed",
        message: String(error),
      });
    }
  }

  function copyHeader() {
    Clipboard.copy(decodedHeader);
    showToast({
      style: Toast.Style.Success,
      title: "Header Copied",
    });
  }

  function copyPayload() {
    Clipboard.copy(decodedPayload);
    showToast({
      style: Toast.Style.Success,
      title: "Payload Copied",
    });
  }

  function copyCleanedToken() {
    Clipboard.copy(processedToken);
    showToast({
      style: Toast.Style.Success,
      title: "Cleaned Token Copied",
    });
  }

  function copyOriginalToken() {
    Clipboard.copy(token);
    showToast({
      style: Toast.Style.Success,
      title: "Original Token Copied",
    });
  }

  function resetForm() {
    setToken("");
    setSecret("");
    setVerify(false);
    setRemovePrefix(true);
    setDecodedHeader("");
    setDecodedPayload("");
    setIsTokenValid(null);
    setProcessedToken("");
    setDetectedPrefix("");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode JWT" icon={Icon.Eye} onSubmit={handleDecode} />
          {decodedHeader && <Action title="Copy Header" icon={Icon.Clipboard} onAction={copyHeader} />}
          {decodedPayload && <Action title="Copy Payload" icon={Icon.Clipboard} onAction={copyPayload} />}
          {processedToken && <Action title="Copy Cleaned Token" icon={Icon.Clipboard} onAction={copyCleanedToken} />}
          {token && <Action title="Copy Original Token" icon={Icon.Clipboard} onAction={copyOriginalToken} />}
          <Action title="Reset Form" icon={Icon.Undo} onAction={resetForm} />
        </ActionPanel>
      }
    >
      <Form.Description text="✨ JWT Decoder - Inspect JSON Web Tokens" />

      <Form.TextArea
        id="token"
        title="JWT Token"
        placeholder="Paste your JWT token here (supports Bearer, Token, JWT prefixes)..."
        value={token}
        onChange={setToken}
      />

      <Form.Separator />

      <Form.Checkbox
        id="removePrefix"
        label="Auto-remove common prefixes (Bearer, Token, etc.)"
        value={removePrefix}
        onChange={setRemovePrefix}
      />

      <Form.Checkbox id="verify" label="Verify Signature" value={verify} onChange={setVerify} />

      {verify && (
        <Form.TextField
          id="secret"
          title="Secret Key (for verification)"
          placeholder="Enter secret key to verify signature..."
          value={secret}
          onChange={setSecret}
        />
      )}

      {(decodedHeader || decodedPayload) && (
        <>
          <Form.Separator />

          {detectedPrefix && detectedPrefix !== "Raw JWT" && (
            <Form.Description text={`Detected prefix: ${detectedPrefix}`} />
          )}

          {isTokenValid !== null && (
            <Form.Description text={`Signature Status: ${isTokenValid ? "✅ Valid" : "❌ Invalid"}`} />
          )}

          {decodedHeader && (
            <>
              <Form.Description text="Decoded Header:" />
              <Form.TextArea id="header" title="Header" value={decodedHeader} onChange={() => {}} />
            </>
          )}

          {decodedPayload && (
            <>
              <Form.Description text="Decoded Payload:" />
              <Form.TextArea id="payload" title="Payload" value={decodedPayload} onChange={() => {}} />
            </>
          )}

          {processedToken && (
            <>
              <Form.Separator />
              <Form.Description text="Processed Token (after prefix removal):" />
              <Form.TextArea id="processedToken" title="Cleaned Token" value={processedToken} onChange={() => {}} />
            </>
          )}
        </>
      )}
    </Form>
  );
}
