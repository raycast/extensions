import { ActionPanel, Form, Action } from "@raycast/api";
import { ENVIRONMENT_TARGET_OPTIONS, getEnvironmentTargets } from "../../environment";
import type { Environment } from "../../types";

type Props = {
  envVar: Environment;
  updateEnvVar: (id: string, envVar: Partial<Environment>) => Promise<void>;
};

const EditEnvironmentVariable = ({ updateEnvVar, envVar }: Props) => {
  const onSubmit = (values: Form.Values) => {
    const formedValues: Pick<Environment, "target" | "key" | "value"> = {
      target: getEnvironmentTargets(values),
      key: values.key,
      value: values.value,
    };

    updateEnvVar(envVar.id, formedValues);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" defaultValue={envVar.key} title="Environment variable key" />
      <Form.TextField id="value" defaultValue={envVar.value} title="Environment variable value" />
      <Form.Separator />
      {ENVIRONMENT_TARGET_OPTIONS.map(({ id, label, target }) => (
        <Form.Checkbox key={id} id={id} label={label} defaultValue={envVar.target?.includes(target)} />
      ))}
    </Form>
  );
};

export default EditEnvironmentVariable;
