import { Action, ActionPanel, Clipboard, Form, Icon, showToast } from "@raycast/api";
import { useState } from "react";
import useBaseConverter from "./converter";

export default function BinaryConverter() {
  const converter = useBaseConverter();
  const [focused, setFocused] = useState({ value: 0, id: 0 });
  const focusedValue = converter.get(focused.value, focused.id);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={`Copy ${focused.value}`}
            onAction={() => {
              Clipboard.copy(focused.value);
              showToast({ title: `Copied ${focusedValue}` });
            }}
          ></Action>
          <Action
            icon={Icon.Trash}
            title="Clear All"
            shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
            onAction={converter.reset}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="base10"
        title="10"
        value={converter.get(10)}
        onChange={(v) => converter.set(10, v)}
        onFocus={() => {
          setFocused({ value: 10, id: 0 });
        }}
      />
      <Form.TextField
        id="base16"
        title="16"
        value={converter.get(16)}
        onChange={(v) => converter.set(16, v, "0x")}
        onFocus={() => {
          setFocused({ value: 16, id: 0 });
        }}
      />
      <Form.TextField
        id="base2"
        title="2"
        value={converter.get(2)}
        onChange={(v) => converter.set(2, v, "0b")}
        onFocus={() => {
          setFocused({ value: 2, id: 0 });
        }}
      />
    </Form>
  );
}
