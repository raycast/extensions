import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { toSmallCaps } from "./small-caps";

export default function Command() {
  const [input, setInput] = useState("");
  const output = useMemo(() => toSmallCaps(input), [input]);

  async function copyOutput() {
    if (!output) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to copy",
        message: "Type some text first",
      });
      return;
    }

    await Clipboard.copy(output);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied small caps text",
    });
  }

  return (
    <Form
      navigationTitle="Small Caps Converter"
      actions={
        <ActionPanel>
          <Action
            title="Copy Small Caps"
            icon={Icon.Clipboard}
            onAction={copyOutput}
          />
          <Action
            title="Clear Input"
            icon={Icon.XmarkCircle}
            onAction={() => setInput("")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Type your text here"
        autoFocus
        value={input}
        onChange={setInput}
        info="Example: example text"
      />
      <Form.Description
        title="Small Caps Output"
        text={output || "Your converted text will appear here."}
      />
    </Form>
  );
}
