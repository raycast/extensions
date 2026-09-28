import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { OllamaApiModelCapability } from "../../../ollama/enum";
import { CommandAnswer } from "../../../settings/enum";
import {
  GetOllamaServerByName,
  SetSettingsCommandAnswer,
  GetResolvedSettingsCommandAnswer,
  GetGlobalDefaultModel,
} from "../../../settings/settings";
import { SettingsCommandAnswer } from "../../../settings/types";
import { GetModels, isThinkingModel } from "../../function";
import { InfoKeepAlive } from "../../info";
import { ValidationKeepAlive, ValidationThinking } from "../../valitadion";
import { ThinkingEffort } from "../../../enum";
import { ThinkingEffort as ThinkingEffortOllama } from "../../../ollama/types";

interface props {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: CallableFunction;
  command: CommandAnswer;
  capabilities?: OllamaApiModelCapability[];
  server?: string;
  model?: string;
  thinking?: ThinkingEffort;
  keep_alive?: string;
}

interface FormData {
  server: string;
  model: string;
  thinking: string;
  keep_alive: string;
}

export function EditModel(props: props): React.JSX.Element {
  const InfoThinking = "Thinking Effort";

  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: () => {
      // Load effective settings (custom or global defaults)
      const loadSettings = async () => {
        const settings = await GetResolvedSettingsCommandAnswer(props.command);
        setValue("server", settings.server);
        setValue("model", settings.model.main.tag);
        setValue(
          "thinking",
          settings.model.main.thinking === false ? "none" : String(settings.model.main.thinking || "none"),
        );
        setValue("keep_alive", settings.model.main.keep_alive || "5m");
      };
      loadSettings();
    },
  });

  const globalDefaults = GetGlobalDefaultModel();

  const [CheckboxAdvanced, SetCheckboxAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      keep_alive: "5m",
    },
    validation: {
      server: FormValidation.Required,
      model: FormValidation.Required,
      thinking: ValidationThinking,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
    },
  });

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action
        title="Reset to Global Defaults"
        icon={Icon.ArrowCounterClockwise}
        onAction={async () => {
          await SetSettingsCommandAnswer(props.command, {
            server: "",
            model: { main: { server: { url: "" }, tag: "" } },
          });
          props.revalidate();
          props.setShow(false);
        }}
      />
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
          thinking: values.thinking === "none" ? false : (values.thinking as ThinkingEffortOllama),
          keep_alive: CheckboxAdvanced ? values.keep_alive : undefined,
        },
      },
    };
    await SetSettingsCommandAnswer(props.command, o);
    await showToast({ style: Toast.Style.Success, title: "Saved" });
    props.revalidate();
    props.setShow(false);
  }

  const hasCustomModel = itemProps.model.value && itemProps.model.value !== globalDefaults.model;
  const hasCustomServer = itemProps.server.value && itemProps.server.value !== globalDefaults.server;
  const hasCustomThinking = itemProps.thinking.value && itemProps.thinking.value !== globalDefaults.thinking;
  const hasCustomKeepAlive = itemProps.keep_alive.value && itemProps.keep_alive.value !== globalDefaults.keepAlive;

  return (
    <Form actions={ActionView} isLoading={IsLoadingModel}>
      {!IsLoadingModel && Model && (
        <React.Fragment>
          <Form.Dropdown title="Server" {...itemProps.server}>
            {[...Model.keys()].sort().map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Model" {...itemProps.model}>
            {itemProps.server.value &&
              Model.get(itemProps.server.value)
                ?.filter((model) => {
                  if (
                    !model.capabilities ||
                    !props.capabilities ||
                    model.capabilities.length < props.capabilities.length
                  )
                    return false;
                  if (
                    props.capabilities.length !==
                    model.capabilities.filter(
                      (c) => props.capabilities && props.capabilities.findIndex((rc) => rc === c) !== -1,
                    ).length
                  )
                    return false;
                  return true;
                })
                ?.sort()
                ?.map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
          </Form.Dropdown>
          {hasCustomServer && <Form.Description title="Global Default Server" text={globalDefaults.server} />}
          {hasCustomModel && (
            <Form.Description title="Global Default Model" text={globalDefaults.model || "(not set)"} />
          )}
          <Form.Dropdown title="Thinking Effort" info={InfoThinking} {...itemProps.thinking}>
            <Form.Dropdown.Item title="None" value="none" key="none" />
            {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
              <Form.Dropdown.Item title="Low" icon={Icon.StackedBars1} value="low" key="low" />
            )}
            {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
              <Form.Dropdown.Item title="Medium" icon={Icon.StackedBars2} value="medium" key="medium" />
            )}
            {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
              <Form.Dropdown.Item title="High" icon={Icon.StackedBars3} value="high" key="high" />
            )}
          </Form.Dropdown>
          {hasCustomThinking && (
            <Form.Description
              title="Global Default Thinking"
              text={
                globalDefaults.thinking === "none"
                  ? "None"
                  : globalDefaults.thinking.charAt(0).toUpperCase() + globalDefaults.thinking.slice(1)
              }
            />
          )}
          <Form.Checkbox
            id="advanced"
            label="Advanced Settings"
            defaultValue={CheckboxAdvanced}
            onChange={SetCheckboxAdvanced}
          />
          {CheckboxAdvanced && <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />}
          {hasCustomKeepAlive && <Form.Description title="Global Default Keep Alive" text={globalDefaults.keepAlive} />}
          {props.command === CommandAnswer.TRANSLATE && (
            <React.Fragment>
              <Form.Separator />
              <Form.Description title="note" text="It is highly recommended to use the TranslateGemma model." />
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </Form>
  );
}
