import { ActionPanel, Form, Action } from "@raycast/api";
import { ENVIRONMENT_TARGET_OPTIONS, getEnvironmentTargets } from "../../environment";
import type { Environment } from "../../types";

type Props = {
  createEnvVar: (envVar: Partial<Environment>) => Promise<void>;
};

const NewEnvironmentVariable = ({ createEnvVar }: Props) => {
  const onSubmit = (values: Form.Values) => {
    const formedValues: Partial<Environment> = {
      target: getEnvironmentTargets(values),
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
      {ENVIRONMENT_TARGET_OPTIONS.map(({ id, label }) => (
        <Form.Checkbox key={id} id={id} label={label} />
      ))}
    </Form>
  );
};

export default NewEnvironmentVariable;
