import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { OllamaApiModelCapability } from "../../../ollama/enum";
import { CommandAnswer } from "../../../settings/enum";
import {
  GetOllamaServerByName,
  SetSettingsCommandAnswer,
  GetSettingsCommandAnswer,
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
  thinking?: ThinkingEffortOllama;
  keep_alive?: string;
}

interface FormData {
  server: string;
  model: string;
  thinking: string;
  keep_alive: string;
  useGlobalDefaults: boolean;
}

export function EditModel(props: props): React.JSX.Element {
  const InfoThinking = "Thinking Effort";

  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: () => {
      // Load existing settings or global defaults
      const loadSettings = async () => {
        try {
          const settings = await GetSettingsCommandAnswer(props.command);
          if (settings.useGlobalDefaults) {
            const globalDefaults = GetGlobalDefaultModel();
            setValue("useGlobalDefaults", true);
            setValue("server", globalDefaults.server);
            setValue("model", globalDefaults.model);
            setValue("thinking", globalDefaults.thinking);
            setValue("keep_alive", globalDefaults.keepAlive);
          } else {
            setValue("useGlobalDefaults", false);
            setValue("server", settings.server);
            setValue("model", settings.model.main.tag);
            setValue(
              "thinking",
              settings.model.main.thinking === false ? "false" : (settings.model.main.thinking as string),
            );
            setValue("keep_alive", settings.model.main.keep_alive || "5m");
          }
        } catch {
          // Fall back to global defaults
          const globalDefaults = GetGlobalDefaultModel();
          setValue("useGlobalDefaults", true);
          setValue("server", globalDefaults.server);
          setValue("model", globalDefaults.model);
          setValue("thinking", globalDefaults.thinking);
          setValue("keep_alive", globalDefaults.keepAlive);
        }
      };
      loadSettings();
    },
  });

  const [CheckboxAdvanced, SetCheckboxAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [UseGlobalDefaults, SetUseGlobalDefaults]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(true);

  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      useGlobalDefaults: true,
      keep_alive: "5m",
    },
    validation: {
      server: () => (UseGlobalDefaults ? undefined : FormValidation.Required),
      model: () => (UseGlobalDefaults ? undefined : FormValidation.Required),
      thinking: ValidationThinking,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
    },
  });

  const globalDefaults = GetGlobalDefaultModel();
  const isUsingGlobalDefaults = UseGlobalDefaults;

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.setShow(false)} />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    if (values.useGlobalDefaults) {
      await SetSettingsCommandAnswer(props.command, {
        server: "",
        model: { main: { server: { url: "" }, tag: "" } },
        useGlobalDefaults: true,
      });
    } else {
      const s = await GetOllamaServerByName(values.server);
      const o: SettingsCommandAnswer = {
        server: values.server,
        model: {
          main: {
            server: s,
            tag: values.model,
            thinking: values.thinking === "false" ? false : (values.thinking as ThinkingEffortOllama),
            keep_alive: CheckboxAdvanced ? values.keep_alive : undefined,
          },
        },
        useGlobalDefaults: false,
      };
      await SetSettingsCommandAnswer(props.command, o);
    }
    props.revalidate();
    props.setShow(false);
  }

  return (
    <Form actions={ActionView} isLoading={IsLoadingModel}>
      {!IsLoadingModel && Model && (
        <React.Fragment>
          <Form.Checkbox
            id="useGlobalDefaults"
            title="Use Global Defaults"
            label="Use global default model settings (configured in preferences)"
            defaultValue={UseGlobalDefaults}
            onChange={(v) => {
              SetUseGlobalDefaults(v);
              setValue("useGlobalDefaults", v);
            }}
          />
          {!UseGlobalDefaults && (
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
            </React.Fragment>
          )}
          {isUsingGlobalDefaults && (
            <React.Fragment>
              <Form.Description title="Global Default Server" text={globalDefaults.server} />
              <Form.Description title="Global Default Model" text={globalDefaults.model || "(not set)"} />
            </React.Fragment>
          )}
          <Form.Dropdown title="Thinking Effort" info={InfoThinking} {...itemProps.thinking}>
            <Form.Dropdown.Item title="None" value={String(ThinkingEffort.None)} key={String(ThinkingEffort.None)} />
            {!isUsingGlobalDefaults && isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
              <Form.Dropdown.Item
                title="Low"
                icon={Icon.StackedBars1}
                value={String(ThinkingEffort.Low)}
                key={String(ThinkingEffort.Low)}
              />
            )}
            {!isUsingGlobalDefaults && isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
              <Form.Dropdown.Item
                title="Medium"
                icon={Icon.StackedBars2}
                value={String(ThinkingEffort.Medium)}
                key={String(ThinkingEffort.Medium)}
              />
            )}
            {!isUsingGlobalDefaults && isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
              <Form.Dropdown.Item
                title="High"
                icon={Icon.StackedBars3}
                value={String(ThinkingEffort.High)}
                key={String(ThinkingEffort.High)}
              />
            )}
            {isUsingGlobalDefaults && (
              <>
                {globalDefaults.thinking !== "none" && (
                  <Form.Dropdown.Item
                    title={`${globalDefaults.thinking.charAt(0).toUpperCase() + globalDefaults.thinking.slice(1)} (Global Default)`}
                    value={globalDefaults.thinking}
                    key={globalDefaults.thinking}
                  />
                )}
              </>
            )}
          </Form.Dropdown>
          {!isUsingGlobalDefaults && (
            <React.Fragment>
              <Form.Checkbox
                id="advanced"
                label="Advanced Settings"
                defaultValue={CheckboxAdvanced}
                onChange={SetCheckboxAdvanced}
              />
              {CheckboxAdvanced && <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />}
              {isUsingGlobalDefaults && globalDefaults.keepAlive && (
                <Form.Description title="Global Default Keep Alive" text={globalDefaults.keepAlive} />
              )}
            </React.Fragment>
          )}
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
