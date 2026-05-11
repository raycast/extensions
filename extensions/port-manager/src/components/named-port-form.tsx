import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { isNumeric } from "../utilities/guards/is-numeric";

type NamedPortFormValues = { name: string; port: string };

type SubmitHandler<V> = ((input: V) => boolean | void | Promise<boolean | void>) | undefined;

function NamedPortForm(props: {
  onSubmit?: SubmitHandler<NamedPortFormValues>;
  initialValues?: Partial<NamedPortFormValues>;
  resetAfterSubmitSucess?: boolean;
}) {
  const { itemProps, reset, handleSubmit } = useForm<NamedPortFormValues>({
    onSubmit: async (values) => {
      return props.onSubmit?.(values);
    },
    initialValues: props.initialValues,
    validation: {
      name: FormValidation.Required,
      port: (v) => {
        if (!isNumeric(v)) {
          return "Please enter a number";
        }
        const parsed = parseInt(v);
        if (parsed < 0 || parsed > 65535) {
          return "Please enter a number between 0 and 65535";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: NamedPortFormValues) => {
              const submitResult = await handleSubmit(values);

              if (submitResult === true && props.resetAfterSubmitSucess) {
                reset(props.initialValues);
              }

              return submitResult;
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Next.js" {...itemProps.name} />
      <Form.TextField title="Port" placeholder="3000" {...itemProps.port} />
    </Form>
  );
}

export { NamedPortForm };
