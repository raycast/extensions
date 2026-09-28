import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
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
import { ThinkingEffort as ThinkingEffortOllama } from "../../../ollama/types";

interface Props {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: CallableFunction;
  command: CommandAnswer;
  capabilities?: string[];
}

interface FormData {
  server: string;
  model: string;
  thinking: string;
  keep_alive: string;
  useGlobalDefaults: boolean;
}

export function EditModel(props: Props): React.JSX.Element {
  const InfoThinking = "Thinking Effort";

  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: () => {
      const loadSettings = async () => {
        const settings = await GetResolvedSettingsCommandAnswer(props.command);
        const hasCustom = !!settings.model.main.tag;
        setValue("useGlobalDefaults", !hasCustom);
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

  const { data: globalDefaults } = usePromise(GetGlobalDefaultModel, []);

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
      keep_alive: (_value) => ValidationKeepAlive(CheckboxAdvanced, _value),
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
    if (values.useGlobalDefaults) {
      await SetSettingsCommandAnswer(props.command, {
        server: "",
        model: { main: { server: { url: "" }, tag: "" } },
      });
    } else {
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
    }
    await showToast({ style: Toast.Style.Success, title: "Saved" });
    props.revalidate();
    props.setShow(false);
  }

  const hasCustomThinking =
    itemProps.thinking.value && globalDefaults && itemProps.thinking.value !== globalDefaults.thinking;
  const hasCustomKeepAlive =
    itemProps.keep_alive.value && globalDefaults && itemProps.keep_alive.value !== globalDefaults.keepAlive;

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
                      // If command has capability requirements, filter by them
                      if (props.capabilities && props.capabilities.length > 0) {
                        if (!model.capabilities || model.capabilities.length < props.capabilities.length) return false;
                        if (
                          props.capabilities.length !==
                          model.capabilities.filter(
                            (c) => props.capabilities && props.capabilities.findIndex((rc) => rc === c) !== -1,
                          ).length
                        )
                          return false;
                      }
                      // If no capability requirements, allow all models (including those with empty capabilities)
                      return true;
                    })
                    ?.sort()
                    ?.map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
              </Form.Dropdown>
            </React.Fragment>
          )}
          {UseGlobalDefaults && (
            <React.Fragment>
              <Form.Description title="Global Default Server" text={globalDefaults?.server || "Local"} />
              <Form.Description title="Global Default Model" text={globalDefaults?.model || "(not set)"} />
            </React.Fragment>
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
                globalDefaults?.thinking === "none"
                  ? "None"
                  : globalDefaults?.thinking?.charAt(0).toUpperCase() + globalDefaults?.thinking?.slice(1) || "None"
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
          {hasCustomKeepAlive && (
            <Form.Description title="Global Default Keep Alive" text={globalDefaults?.keepAlive || "5m"} />
          )}
          {props.command === "translate" && (
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
