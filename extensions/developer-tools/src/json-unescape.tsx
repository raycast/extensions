import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import { addSlashes, removeSlashes } from "slashes";

interface JSONUnescapeForm {
  escaped: string;
  unescaped: string;
}

export default function Command() {
  const { handleSubmit, itemProps, values, setValue } = useForm<JSONUnescapeForm>({
    initialValues: {
      escaped: "",
      unescaped: "",
    },
    onSubmit: (formValues: JSONUnescapeForm) => {
      Clipboard.copy(formValues.unescaped);
      showHUD("Copied unescaped text to clipboard");
    },
  });

  useEffect(() => {
    const unescaped = removeSlashes(values.escaped);
    setValue("unescaped", unescaped);
  }, [values.escaped]);

  useEffect(() => {
    const escaped = addSlashes(values.unescaped);
    setValue("escaped", escaped);
  }, [values.unescaped]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Unescaped Text" onSubmit={handleSubmit} />
          <Action
            title="Copy Escaped Text"
            onAction={() => {
              Clipboard.copy(values.escaped);
              showHUD("Copied escaped text to clipboard");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.escaped}
        title="Escaped JSON String"
        placeholder="Enter escaped JSON string (e.g. Hello\nWorld)"
        onChange={(value) => setValue("escaped", value)}
        autoFocus
      />
      <Form.TextArea
        {...itemProps.unescaped}
        title="Unescaped JSON String"
        onChange={(value) => setValue("unescaped", value)}
      />
    </Form>
  );
}
