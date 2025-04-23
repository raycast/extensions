import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { copyWithFeedback } from "./utils/clipboard";

interface URLEncodeForm {
  decoded: string;
  encoded: string;
}

export default function Command() {
  const { itemProps, values, setValue } = useForm<URLEncodeForm>({
    initialValues: {
      decoded: "",
      encoded: "",
    },
    onSubmit: (formValues: URLEncodeForm) => {
      copyWithFeedback(formValues.encoded);
    },
  });

  const setEncoded = (value: string) => {
    setValue("encoded", value);
    const newDecoded = decodeURIComponent(value);
    setValue("decoded", newDecoded);
  };

  const setDecoded = (value: string) => {
    setValue("decoded", value);
    try {
      const newEncoded = encodeURIComponent(value);
      setValue("encoded", newEncoded);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Copy Encoded URL" onAction={() => copyWithFeedback(values.encoded)} />
          <Action
            title="Copy Decoded URL"
            onAction={() => {
              copyWithFeedback(values.decoded);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.decoded}
        title="Decoded"
        placeholder="Enter text to URL encode"
        onChange={setDecoded}
        autoFocus
      />
      <Form.TextArea
        {...itemProps.encoded}
        title="Encoded"
        placeholder="Enter text to URL decode"
        value={values.encoded}
        onChange={setEncoded}
      />
    </Form>
  );
}
