import { Form, ActionPanel, Action } from "@raycast/api";
import { INPUT_PLACEHOLDER } from "./const";
import { useState } from "react";

export default function Command() {
  const [result, setResult] = useState<string>("");

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={async (values: Values) => {
                const inputValue: string = values.inputTextField;
                setResult(`'${inputValue}' has length ${inputValue.length}`);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Get the length of your input string" />
        <Form.TextField id="inputTextField" title="Input String" placeholder={INPUT_PLACEHOLDER} />
        {result && <Form.Description text={result}></Form.Description>}
      </Form>
    </>
  );
}
