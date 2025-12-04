import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";

import { copyFormattedJs, formatToJSONLines } from "./utils";
import { useForm } from "@raycast/utils";
import { FormattedJsonDetail } from "./formattedJsonDetail";

interface FormInput {
  input: string;
  action: "format" | "view";
}

export default function Command() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormInput>({
    onSubmit: async ({ input, action }) => {
      const output = await formatToJSONLines(input);

      if (output) {
        const outputStr = output.join("\n");
        if (action === "format") {
          await copyFormattedJs(outputStr);
        } else {
          push(<FormattedJsonDetail json={output} />);
        }
      }
    },
    initialValues: { input: "" },
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
      <Form.Description text="Press Command + Shift + Enter to view result." />
    </Form>
  );
}
