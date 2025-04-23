import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { addSlashes, removeSlashes } from "slashes";
import { copyWithFeedback } from "./utils/clipboard";
interface JSONUnescapeForm {
  escaped: string;
  unescaped: string;
}

export default function Command() {
  const { itemProps, values, setValue } = useForm<JSONUnescapeForm>({
    initialValues: {
      escaped: "",
      unescaped: "",
    },
    onSubmit: (formValues: JSONUnescapeForm) => {
      copyWithFeedback(formValues.unescaped);
    },
  });

  const setEscaped = (value: string) => {
    setValue("escaped", value);
    const newUnescaped = removeSlashes(value);
    setValue("unescaped", newUnescaped);
  };

  const setUnescaped = (value: string) => {
    setValue("unescaped", value);
    const newEscaped = addSlashes(value);
    setValue("escaped", newEscaped);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Copy Unescaped Text"
            onAction={() => {
              copyWithFeedback(values.unescaped);
            }}
          />
          <Action
            title="Copy Escaped Text"
            onAction={() => {
              copyWithFeedback(values.escaped);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.escaped}
        title="Escaped JSON String"
        placeholder="Enter JSON string to unescape"
        onChange={setEscaped}
        autoFocus
      />
      <Form.TextArea
        {...itemProps.unescaped}
        title="Unescaped JSON String"
        placeholder="Enter JSON string to escape"
        onChange={setUnescaped}
      />
    </Form>
  );
}
