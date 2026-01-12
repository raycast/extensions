import { ActionPanel, Action, Form, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useState } from "react";
import * as jwt from "jsonwebtoken";

export default function Command() {
  const [header, setHeader] = useState('{\n  "alg": "none",\n  "typ": "JWT"\n}');
  const [payload, setPayload] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  const [secret, setSecret] = useState("");
  const [algorithm, setAlgorithm] = useState("none");
  const [tokenPrefix, setTokenPrefix] = useState("");
  const [encodedToken, setEncodedToken] = useState("");

  function validateJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  function handleEncode() {
    if (!validateJSON(header)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Header",
        message: "Please provide valid JSON for header",
      });
      return;
    }

    if (!validateJSON(payload)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Payload",
        message: "Please provide valid JSON for payload",
      });
      return;
    }

    try {
      const headerObj = JSON.parse(header);
      const payloadObj = JSON.parse(payload);

      const token = jwt.sign(payloadObj, secret, {
        algorithm: algorithm as jwt.Algorithm,
        header: headerObj,
      });

      setEncodedToken(token);

      // 自动复制到剪贴板
      const fullToken = tokenPrefix + token;
      Clipboard.copy(fullToken);

      showToast({
        style: Toast.Style.Success,
        title: "JWT Encoded Successfully",
        message: `Copied to clipboard with ${tokenPrefix || "no"} prefix`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Encoding Failed",
        message: String(error),
      });
    }
  }

  function copyToClipboard() {
    const fullToken = tokenPrefix + encodedToken;
    Clipboard.copy(fullToken);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: `Copied with prefix: ${tokenPrefix || "None"}`,
    });
  }

  function resetForm() {
    setHeader('{\n  "alg": "none",\n  "typ": "JWT"\n}');
    setPayload('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
    setSecret("");
    setAlgorithm("none");
    setEncodedToken("");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encode JWT" icon={Icon.Key} onSubmit={handleEncode} />
          {encodedToken && <Action title="Copy Token" icon={Icon.Clipboard} onAction={copyToClipboard} />}
          {encodedToken && <Action title="Done" icon={Icon.Checkmark} onAction={() => null} />}
          <Action title="Reset Form" icon={Icon.Undo} onAction={resetForm} />
        </ActionPanel>
      }
    >
      <Form.Description text="✨ JWT Encoder - Create JSON Web Tokens" />

      <Form.TextArea
        id="header"
        title="Header"
        placeholder="Enter JWT header as JSON..."
        value={header}
        onChange={setHeader}
      />

      <Form.TextArea
        id="payload"
        title="Payload"
        placeholder="Enter JWT payload as JSON..."
        value={payload}
        onChange={setPayload}
      />

      <Form.Separator />

      <Form.TextField
        id="secret"
        title="Secret Key"
        placeholder="Enter your secret key..."
        value={secret}
        onChange={setSecret}
      />

      <Form.Dropdown id="algorithm" title="Algorithm" value={algorithm} onChange={setAlgorithm}>
        <Form.Dropdown.Item value="none" title="none (no signature)" />
        <Form.Dropdown.Item value="HS256" title="HS256" />
        <Form.Dropdown.Item value="HS384" title="HS384" />
        <Form.Dropdown.Item value="HS512" title="HS512" />
        <Form.Dropdown.Item value="RS256" title="RS256" />
        <Form.Dropdown.Item value="RS384" title="RS384" />
        <Form.Dropdown.Item value="RS512" title="RS512" />
      </Form.Dropdown>

      <Form.Dropdown id="prefix" title="Token Prefix" value={tokenPrefix} onChange={setTokenPrefix}>
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="Bearer " title="Bearer" />
        <Form.Dropdown.Item value="Token " title="Token" />
        <Form.Dropdown.Item value="JWT " title="JWT" />
        <Form.Dropdown.Item value="Basic " title="Basic" />
      </Form.Dropdown>

      {encodedToken && (
        <>
          <Form.Separator />
          <Form.Description text={`Encoded JWT Token (with ${tokenPrefix || "no"} prefix):`} />
          <Form.TextArea
            id="encodedToken"
            title="Result"
            value={tokenPrefix ? `${tokenPrefix}${encodedToken}` : encodedToken}
            onChange={() => {}}
          />
        </>
      )}
    </Form>
  );
}
