import { ActionPanel, Form, Action } from "@raycast/api";
import type { Environment } from "../../types";

type Props = {
  createEnvVar: (envVar: Partial<Environment>) => Promise<void>;
};

const NewEnvironmentVariable = ({ createEnvVar }: Props) => {
  const onSubmit = (values: Form.Values) => {
    const targets = () => {
      const target = [];
      if (values["edit-form-development"]) target.push("development");
      if (values["edit-form-preview"]) target.push("preview");
      if (values["edit-form-production"]) target.push("production");
      return target;
    };

    const formedValues: Partial<Environment> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      target: targets() as any,
      key: values.key,
      value: values.value,
    };
    createEnvVar(formedValues);
  };

  return (
    <Form
      navigationTitle="New Environment Variable"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="Environment variable key" placeholder="YOUR_KEY" />
      <Form.TextField id="value" title="Environment variable value" placeholder="your_value" />
      <Form.Separator />
      <Form.Checkbox id="edit-form-production" label="Production" />
      <Form.Checkbox id="edit-form-preview" label="Preview" />
      <Form.Checkbox id="edit-form-development" label="Development" />
    </Form>
  );
};

export default NewEnvironmentVariable;
