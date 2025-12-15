import { ActionPanel, Action, Form, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { decryptVigenere } from "./utils/vigenere";

export default function Command() {
  const [ciphertext, setCiphertext] = useState("");
  const [key, setKey] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text) {
        setCiphertext(text);
      }
    });
  }, []);

  useEffect(() => {
    if (ciphertext && key) {
      setResult(decryptVigenere(ciphertext, key));
    } else {
      setResult("");
    }
  }, [ciphertext, key]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={result} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="ciphertext"
        title="Ciphertext"
        placeholder="Enter encrypted text..."
        value={ciphertext}
        onChange={setCiphertext}
      />
      <Form.TextField
        id="key"
        title="Key"
        placeholder="Enter secret key..."
        value={key}
        onChange={setKey}
        autoFocus={true}
      />
      <Form.Description title="Decrypted Text" text={result || ""} />
    </Form>
  );
}
