import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { OllamaApiModelCapability } from "../../../ollama/enum";
import { CommandAnswer } from "../../../settings/enum";
import { GetOllamaServerByName, SetSettingsCommandAnswer } from "../../../settings/settings";
import { SettingsCommandAnswer } from "../../../settings/types";
import { GetModels } from "../../function";
import { InfoKeepAlive } from "../../info";
import { UiModelDetails } from "../../types";
import { ValidationKeepAlive } from "../../valitadion";

interface props {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: CallableFunction;
  command: CommandAnswer;
  capabilities?: OllamaApiModelCapability[];
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
  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: (data) => {
      if (props.server === undefined || props.model === undefined) return;

      if (data.has(props.server)) {
        setValue("server", props.server);
        const models = (data.get(props.server) as UiModelDetails[]).filter((model) => {
          if (!model.capabilities || !props.capabilities || model.capabilities.length < props.capabilities.length)
            return false;
          if (
            props.capabilities.length !==
            model.capabilities.filter(
              (c) => props.capabilities && props.capabilities.findIndex((rc) => rc === c) !== -1
            ).length
          )
            return false;
          return true;
        });
        if (models?.some((model) => model.name === props.model)) setValue("model", props.model);
      }
    },
  });
  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
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
          {itemProps.server.value &&
            Model.get(itemProps.server.value)!
              .filter((model) => {
                if (!model.capabilities || !props.capabilities || model.capabilities.length < props.capabilities.length)
                  return false;
                if (
                  props.capabilities.length !==
                  model.capabilities.filter(
                    (c) => props.capabilities && props.capabilities.findIndex((rc) => rc === c) !== -1
                  ).length
                )
                  return false;
                return true;
              })
              .sort()
              .map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
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
