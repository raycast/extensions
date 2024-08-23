import { Action, ActionPanel, Form, Icon } from "@raycast/api";

import { copyFormattedJs, formatToJSONLines } from "./utils";
import { useForm } from "@raycast/utils";

interface FormInput {
  input: string;
  result: string;
  action: "format" | "view";
}

export default function Command() {
  const { setValue, handleSubmit, itemProps, values } = useForm<FormInput>({
    onSubmit: async ({ input, action }) => {
      const output = await formatToJSONLines(input);
      if (output) {
        if (action === "view") {
          setValue("result", output);
        } else {
          await copyFormattedJs(output);
        }
      }
    },
    initialValues: { input: "", result: "" },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Format"
            icon={Icon.Clipboard}
            onSubmit={() => handleSubmit({ ...values, action: "format" })}
          />
          <Action.SubmitForm
            title="View Result"
            icon={Icon.Eye}
            onSubmit={() => handleSubmit({ ...values, action: "view" })}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Input" placeholder="Paste JSON Array here…" {...itemProps.input} />
      <Form.TextArea title="Result" placeholder="Command + Shift + Enter to view result..." {...itemProps.result} />
    </Form>
  );
}
