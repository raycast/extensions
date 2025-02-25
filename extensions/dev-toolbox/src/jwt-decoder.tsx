import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { jwtDecode } from "jwt-decode";

export default function JwtDecoder() {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState("");
  const [payload, setPayload] = useState("");

  const decodeToken = () => {
    try {
      const decodedHeader = jwtDecode(token, { header: true });
      const decodedPayload = jwtDecode(token);

      setHeader(JSON.stringify(decodedHeader, null, 2));
      setPayload(JSON.stringify(decodedPayload, null, 2));
      showToast({ style: Toast.Style.Success, title: "Token decoded" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Invalid JWT" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode Token" onSubmit={decodeToken} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="token" title="JWT Token" value={token} onChange={setToken} />
      {header && <Form.TextArea id="header" title="Header" value={header} />}
      {payload && <Form.TextArea id="payload" title="Payload" value={payload} />}
    </Form>
  );
}
