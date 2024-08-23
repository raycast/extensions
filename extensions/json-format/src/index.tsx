import { ActionPanel, Icon, Form, Action } from "@raycast/api";

import { copyFormattedJs, formatJS } from "./utils";
import { useForm } from "@raycast/utils";

interface FormInput {
  input: string;
  result: string;
  action: "format" | "view";
}

export default function main() {
  const { setValue, values, itemProps, handleSubmit } = useForm<FormInput>({
    onSubmit: async ({ input, action }) => {
      const output = await formatJS(input);

      if (output) {
        if (action === "format") {
          await copyFormattedJs(output);
        } else {
          setValue("result", output);
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
      <Form.TextArea title="Input" placeholder="Paste JSON here…" {...itemProps.input} />
      <Form.TextArea title="Result" placeholder="Command + Shift + Enter to view result..." {...itemProps.result} />
    </Form>
  );
}
