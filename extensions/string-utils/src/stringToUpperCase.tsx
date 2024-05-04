import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { INPUT_PLACEHOLDER } from "./const";
import { useState } from "react";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={async (values: Values) => {
                const input: string = values.inputTextField;
                const output = input.toUpperCase();
                if (output) {
                  showToast({ title: "Done" });
                  setOutput(output);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Convert to Upper Case" />
        <Form.TextField
          id="inputTextField"
          title="Input"
          placeholder={INPUT_PLACEHOLDER}
          value={input}
          onChange={setInput}
        />
        <Form.TextField id="ouputTextField" title="Upper Case" value={output} onChange={setOutput} />
      </Form>
    </>
  );
}
