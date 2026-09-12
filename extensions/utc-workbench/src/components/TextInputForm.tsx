import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";

type TextInputFormProps = {
  readonly title: string;
  readonly fieldTitle: string;
  readonly placeholder: string;
  readonly initialValue?: string;
  readonly multiline?: boolean;
  readonly onSubmit: (value: string) => Promise<void> | void;
};

/**
 * Generic single-field form used for Label, URL, and Note inputs.
 * Switches between `TextField` and `TextArea` via the `multiline` prop.
 */
export function TextInputForm({
  title,
  fieldTitle,
  placeholder,
  initialValue,
  multiline,
  onSubmit,
}: TextInputFormProps) {
  const { pop } = useNavigation();
  const defaultValue = initialValue ?? "";

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { value: string }) => {
              await onSubmit(values.value);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {multiline === true ? (
        <Form.TextArea id="value" title={fieldTitle} placeholder={placeholder} defaultValue={defaultValue} />
      ) : (
        <Form.TextField id="value" title={fieldTitle} placeholder={placeholder} defaultValue={defaultValue} />
      )}
    </Form>
  );
}
