import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { CommandAnswer } from "./lib/settings/enum";
import {
  GetOllamaServerByName,
  SetSettingsCommandAnswer,
  GetResolvedSettingsCommandAnswer,
  GetGlobalDefaultModel,
} from "./lib/settings/settings";
import { SettingsCommandAnswer } from "./lib/settings/types";
import { GetModels, isThinkingModel } from "./lib/ui/function";
import { InfoKeepAlive } from "./lib/ui/info";
import { ValidationKeepAlive, ValidationThinking } from "./lib/ui/valitadion";
import { ThinkingEffort as ThinkingEffortOllama } from "./lib/ollama/types";
import { LaunchProps } from "@raycast/api";

interface Props extends LaunchProps<{ arguments: { command: CommandAnswer } }> {
  command: CommandAnswer;
}

interface FormData {
  server: string;
  model: string;
  thinking: string;
  keep_alive: string;
}

export default function Command(props: Props): React.JSX.Element {
  const { command } = props.arguments;
  const InfoThinking = "Thinking Effort";

  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: () => {
      const loadSettings = async () => {
        const settings = await GetResolvedSettingsCommandAnswer(command);
        SetCheckboxAdvanced(!!settings.model.main.keep_alive);
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
          await SetSettingsCommandAnswer(command, {
            server: "",
            model: { main: { server: { url: "" }, tag: "" } },
          });
          await showToast({ style: Toast.Style.Success, title: "Reset to global defaults" });
        }}
      />
      <Action title="Close" icon={Icon.Xmark} onAction={() => {}} />
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
    await SetSettingsCommandAnswer(command, o);
    await showToast({ style: Toast.Style.Success, title: "Saved" });
  }

  const hasCustomModel = itemProps.model.value && globalDefaults && itemProps.model.value !== globalDefaults.model;
  const hasCustomServer = itemProps.server.value && globalDefaults && itemProps.server.value !== globalDefaults.server;
  const hasCustomThinking =
    itemProps.thinking.value && globalDefaults && itemProps.thinking.value !== globalDefaults.thinking;
  const hasCustomKeepAlive =
    itemProps.keep_alive.value && globalDefaults && itemProps.keep_alive.value !== globalDefaults.keepAlive;

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
                ?.slice()
                ?.sort((a, b) => a.name.localeCompare(b.name))
                ?.map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)}
          </Form.Dropdown>
          {hasCustomServer && (
            <Form.Description title="Global Default Server" text={globalDefaults?.server || "Local"} />
          )}
          {hasCustomModel && (
            <Form.Description title="Global Default Model" text={globalDefaults?.model || "(not set)"} />
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
        </React.Fragment>
      )}
    </Form>
  );
}
