import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";
import CryptoJS from "crypto-js";

export default function HashGenerator() {
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState<"MD5" | "SHA256" | "SHA512">("MD5");

  const getHash = () => {
    switch (algorithm) {
      case "MD5":
        return CryptoJS.MD5(input).toString();
      case "SHA256":
        return CryptoJS.SHA256(input).toString();
      case "SHA512":
        return CryptoJS.SHA512(input).toString();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Hash"
            onSubmit={() => {
              const hash = getHash();
              Clipboard.copy(hash);
              showToast({ style: Toast.Style.Success, title: "Hash copied!" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="algorithm"
        title="Algorithm"
        value={algorithm}
        onChange={(val) => setAlgorithm(val as "MD5" | "SHA256" | "SHA512")}
      >
        <Form.Dropdown.Item value="MD5" title="MD5" />
        <Form.Dropdown.Item value="SHA256" title="SHA-256" />
        <Form.Dropdown.Item value="SHA512" title="SHA-512" />
      </Form.Dropdown>
      <Form.TextArea id="input" title="Input" value={input} onChange={setInput} />
      {input && <Form.Description text={`${algorithm} Hash: ${getHash()}`} />}
    </Form>
  );
}
