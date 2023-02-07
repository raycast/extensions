import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { useState } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";

type Values = {
  text: string;
  algorithm: string;
};

export default function Command() {
  const [stringError, setStringError] = useState<string | undefined>();
  async function handleSubmit(values: Values) {
    if (!isTextValid(values.text)) {
      setStringError("The field should't be empty!");
      return;
    }

    let hash = "";
    if (values.algorithm === "bcrypt") {
      const salt = bcrypt.genSaltSync(10);
      hash = bcrypt.hashSync(values.text, salt);
    } else {
      hash = crypto.createHash(values.algorithm).update(values.text).digest("hex");
    }

    await Clipboard.copy(hash);
    showToast({ title: "Generated", message: "Hash saved to clipboard" });
  }

  function dropStringErrorIfNeeded() {
    if (stringError && stringError.length > 0) {
      setStringError(undefined);
    }
  }

  function isTextValid(text: string | undefined) {
    return text?.length != 0;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Text"
        placeholder="Enter string that you want to hash"
        error={stringError}
        onChange={dropStringErrorIfNeeded}
        onBlur={(event) => {
          if (!isTextValid(event.target.value)) {
            setStringError("The field should't be empty!");
          } else {
            dropStringErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown id="algorithm" title="Select hashing algorithm" defaultValue="bcrypt">
        <Form.Dropdown.Item value="bcrypt" title="Bcrypt" />
        <Form.Dropdown.Item value="sha1" title="SHA1" />
        <Form.Dropdown.Item value="sha256" title="SHA256" />
        <Form.Dropdown.Item value="sha512" title="SHA512" />
        <Form.Dropdown.Item value="md5" title="MD5" />
        <Form.Dropdown.Item value="sha224" title="SHA224" />
        <Form.Dropdown.Item value="sha384" title="SHA384" />
        <Form.Dropdown.Item value="sha3-224" title="SHA3 224" />
        <Form.Dropdown.Item value="sha3-256" title="SHA3 256" />
        <Form.Dropdown.Item value="sha3-384" title="SHA3 384" />
        <Form.Dropdown.Item value="sha3-512" title="SHA3 512" />
      </Form.Dropdown>
    </Form>
  );
}
