import { ActionPanel, Action, Form, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import crypto from "crypto";

export default function Command() {
  const [text, setText] = useState("");
  const [key, setKey] = useState("secret");
  const [result, setResult] = useState("");

  useEffect(() => {
    Clipboard.readText().then((clip) => {
      if (clip) {
        setText(clip);
      }
    });
  }, []);

  useEffect(() => {
    if (!text) {
      setResult("");
      return;
    }

    try {
      // Key needs to be 32 bytes (256 bits). Use SHA256(key).
      const aesKey = crypto
        .createHash("sha256")
        .update(key || "")
        .digest();
      const iv = Buffer.alloc(16, 0); // Zero IV for deterministic display

      const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      setResult(encrypted.toUpperCase());
    } catch {
      setResult("Error encrypting");
    }
  }, [text, key]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={result} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Input Text"
        placeholder="Enter text to encrypt..."
        value={text}
        onChange={setText}
      />
      <Form.TextField
        id="key"
        title="Key"
        placeholder="Encryption Key"
        value={key}
        onChange={setKey}
        autoFocus={true}
      />
      <Form.Description title="Encrypted (Hex)" text={result} />
    </Form>
  );
}
