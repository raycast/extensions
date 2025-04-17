import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";

interface URLEncodeForm {
  decoded: string;
  encoded: string;
}

export default function Command() {
  const { handleSubmit, itemProps, values, setValue } = useForm<URLEncodeForm>({
    initialValues: {
      decoded: "",
      encoded: "",
    },
    onSubmit: (formValues: URLEncodeForm) => {
      Clipboard.copy(formValues.encoded);
      showHUD("Copied encoded URL to clipboard");
    },
  });

  useEffect(() => {
    const encoded = encodeURIComponent(values.decoded);
    setValue("encoded", encoded);
  }, [values.decoded]);

  useEffect(() => {
    const decoded = decodeURIComponent(values.encoded);
    setValue("decoded", decoded);
  }, [values.encoded]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Encoded URL" onSubmit={handleSubmit} />
          <Action
            title="Copy Decoded URL"
            onAction={() => {
              Clipboard.copy(values.decoded);
              showHUD("Copied decoded URL to clipboard");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.decoded}
        title="Decoded"
        placeholder="Enter text to URL encode"
        onChange={(value) => setValue("decoded", value)}
        autoFocus
      />
      <Form.TextArea
        {...itemProps.encoded}
        title="Encoded"
        placeholder="Enter text to URL decode"
        value={values.encoded}
        onChange={(value) => setValue("encoded", value)}
      />
    </Form>
  );
}
