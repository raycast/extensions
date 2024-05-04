import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";
import { INPUT_PLACEHOLDER } from "./const";

function reverseString(str: string) {
  const splitString = str.split("");
  const reverseArray = splitString.reverse();
  const joinArray = reverseArray.join("");
  return joinArray;
}

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Format"
              onSubmit={async (values: Values) => {
                const input: string = values.inputTextField;
                const output = reverseString(input);
                if (output) {
                  showToast({ title: "Done" });
                  setOutput(output);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Reverse your input string" />
        <Form.TextField
          id="inputTextField"
          title="Input"
          placeholder={INPUT_PLACEHOLDER}
          value={input}
          onChange={setInput}
        />
        <Form.TextField id="outputTextField" title="Output" placeholder="" value={output} onChange={setOutput} />
      </Form>
    </>
  );
}
