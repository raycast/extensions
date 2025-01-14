import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { CommandAnswer } from "../../../settings/enum";
import { GetOllamaServerByName, SetSettingsCommandAnswer } from "../../../settings/settings";
import { SettingsCommandAnswer } from "../../../settings/types";
import { GetModelsName } from "../../function";
import { InfoKeepAlive } from "../../info";
import { ValidationKeepAlive } from "../../valitadion";

interface props {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: CallableFunction;
  command: CommandAnswer;
  server?: string;
  model?: string;
  keep_alive?: string;
}

interface FormData {
  server: string;
  model: string;
  keep_alive: string;
}

export function EditModel(props: props): JSX.Element {
  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModelsName, []);
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      server: props.server,
      model: props.model,
      keep_alive: props.keep_alive ? props.keep_alive : "5m",
    },
    validation: {
      server: FormValidation.Required,
      model: FormValidation.Required,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
    },
  });

  const [CheckboxAdvanced, SetCheckboxAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.keep_alive ? true : false);

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.setShow(false)} />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    const s = await GetOllamaServerByName(values.server);
    const o: SettingsCommandAnswer = {
      server: values.server,
      model: {
        main: {
          server: s,
          tag: values.model,
          keep_alive: CheckboxAdvanced ? values.keep_alive : undefined,
        },
      },
    };
    await SetSettingsCommandAnswer(props.command, o);
    props.revalidate();
    props.setShow(false);
  }

  return (
    <Form actions={ActionView} isLoading={IsLoadingModel}>
      {!IsLoadingModel && Model && (
        <Form.Dropdown title="Server" {...itemProps.server}>
          {[...Model.keys()].sort().map((s) => (
            <Form.Dropdown.Item title={s} value={s} key={s} />
          ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.server.value && (
        <Form.Dropdown title="Model" {...itemProps.model}>
          {[...Model.entries()]
            .filter((v) => v[0] === itemProps.server.value)[0][1]
            .sort()
            .map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
        </Form.Dropdown>
      )}
      <Form.Checkbox
        id="advanced"
        label="Advanced Settings"
        defaultValue={CheckboxAdvanced}
        onChange={SetCheckboxAdvanced}
      />
      {CheckboxAdvanced && <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />}
    </Form>
  );
}
