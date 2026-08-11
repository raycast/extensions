import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { modules } from "./raycast/create-modules";

type Values = { length: string; numbers: boolean; uppercase: boolean; symbols: boolean };

export default function Command() {
  const [password, setPassword] = useState("");

  async function submit(values: Values) {
    const generated = await modules.passwords.generate({
      length: Number(values.length) || 20,
      numbers: values.numbers,
      uppercase: values.uppercase,
      symbols: values.symbols,
    });
    setPassword(generated);
    await Clipboard.copy(generated);
    await showToast({ style: Toast.Style.Success, title: "Password generated and copied" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate and Copy" onSubmit={submit} />
          {password ? <Action.CopyToClipboard title="Copy Password" content={password} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="length" title="Length" defaultValue="20" />
      <Form.Checkbox id="numbers" label="Include numbers" defaultValue />
      <Form.Checkbox id="uppercase" label="Include uppercase letters" defaultValue />
      <Form.Checkbox id="symbols" label="Include symbols" defaultValue />
      {password ? <Form.Description title="Generated password" text={password} /> : null}
    </Form>
  );
}
