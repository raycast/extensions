import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";
import { replace } from "unicodeit";

export default function Command() {
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");

  const update = (text: string) => {
    setInputText(text);
    setOutputText(replace(text));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Text to Clipboard"
            content={outputText}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.CopyToClipboard
            title="Copy Input Text to Clipboard"
            content={inputText}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="inputTextField" title="Input" placeholder="f(x) = \pi + \lambda_0" onChange={update} />
      <Form.TextArea
        title="Result"
        id="outputTextField"
        value={outputText}
        onChange={() => {
          console.log("changed");
        }}
      />
    </Form>
  );
}
