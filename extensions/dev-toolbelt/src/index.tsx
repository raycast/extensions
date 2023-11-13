import { Action, ActionPanel, Form } from "@raycast/api";
import React, { lazy, useState } from "react";

const imports = [
  {
    title: "Encode text",
    value: "encodeBase64",
    import: () => lazy(() => import("./encodeBase64")),
  },
  {
    title: "Decode base64",
    value: "decodeBase64",
    import: () => lazy(() => import("./decodeBase64")),
  },
];

export default function Command() {
  const [Render, setRender] = useState<null | React.FC>(null);

  return Render ? (
    <Render />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (v) => {
              const value = v.dropdown;
              const item = imports.find((x) => x.value === value);
              if (!item) return;
              else return setRender(item.import());
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="dropdown" title="Dropdown">
        {imports.map((x) => (
          <Form.Dropdown.Item value={x.value} title={x.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
