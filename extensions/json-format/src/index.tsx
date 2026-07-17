import { ActionPanel, Icon, Form, Action, useNavigation } from "@raycast/api";

import { copyFormattedJs, formatJS } from "./utils";
import { useForm } from "@raycast/utils";
import { FormattedJsonDetail } from "./formattedJsonDetail";

interface FormInput {
  input: string;
  action: "format" | "view";
}

export default function main() {
  const { push } = useNavigation();
  const { values, itemProps, handleSubmit } = useForm<FormInput>({
    onSubmit: async ({ input, action }) => {
      const output = await formatJS(input);

      if (output) {
        if (action === "format") {
          await copyFormattedJs(output);
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
      <Form.TextArea title="Input" placeholder="Paste JSON here…" {...itemProps.input} />
      <Form.Description text="Press Command + Shift + Enter to view result." />
    </Form>
  );
}
