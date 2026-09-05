import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { CommandAnswer } from "../../../settings/enum";
import { GetOllamaServerByName, SetSettingsCommandAnswer } from "../../../settings/settings";
import { SettingsCommandAnswer } from "../../../settings/types";
import { GetModels, isThinkingModel } from "../../function";
import { InfoKeepAlive } from "../../info";
import { UiModelDetails } from "../../types";
import { ValidationKeepAlive, ValidationThinking } from "../../valitadion";
import { ModelCapability, ThinkingEffort } from "../../../enum";
import { ThinkingEffort as ThinkingEffortOllama } from "../../../ollama/types";
import { isCustomServer } from "../../../providers/unified-provider";

interface props {
  setShow?: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: CallableFunction;
  command: CommandAnswer;
  capabilities?: ModelCapability[];
  server?: string;
  model?: string;
  thinking?: ThinkingEffortOllama;
  keep_alive?: string;
  prompt?: string;
  action?: "view" | "replace";
}

interface FormData {
  server: string;
  model: string;
  thinking: string;
  keep_alive: string;
  prompt: string;
  action: string;
}

export function EditModel(props: props): React.JSX.Element {
  const { pop } = useNavigation();
  const InfoThinking = "Thinking Effort";

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
              (c) => props.capabilities && props.capabilities.findIndex((rc) => rc === c) !== -1,
            ).length
          )
            return false;
          return true;
        });
        if (models?.some((model) => model.name === props.model)) setValue("model", props.model);
        setValue("thinking", props.thinking === false ? "false" : (props.thinking as string));
        if (props.prompt !== undefined) setValue("prompt", props.prompt);
        if (props.action !== undefined) setValue("action", props.action);
      }
    },
  });
  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      keep_alive: props.keep_alive ? props.keep_alive : "5m",
      prompt: props.prompt ? props.prompt : "",
      action: props.action ? props.action : "view",
    },
    validation: {
      server: FormValidation.Required,
      model: FormValidation.Required,
      thinking: ValidationThinking,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
      prompt: FormValidation.Required,
      action: FormValidation.Required,
    },
  });

  const [CheckboxAdvanced, SetCheckboxAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(props.keep_alive ? true : false);

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action
        title="Close"
        icon={Icon.Xmark}
        onAction={() => {
          if (props.setShow) {
            props.setShow(false);
          } else {
            pop();
          }
        }}
      />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    const isCustom = isCustomServer(values.server);
    const s = isCustom ? undefined : await GetOllamaServerByName(values.server);
    const o: SettingsCommandAnswer = {
      server: values.server,
      model: {
        main: {
          server: s,
          tag: values.model,
          thinking: values.thinking === "false" ? false : (values.thinking as ThinkingEffortOllama),
          keep_alive: !isCustom && CheckboxAdvanced ? values.keep_alive : undefined,
        },
      },
      prompt: values.prompt,
      action: values.action as "view" | "replace",
    };
    await SetSettingsCommandAnswer(props.command, o);
    props.revalidate();
    if (props.setShow) {
      props.setShow(false);
    } else {
      pop();
    }
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
            Model.get(itemProps.server.value)
              ?.filter((model) => {
                if (!model.capabilities || !props.capabilities || model.capabilities.length < props.capabilities.length)
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
      )}
      <Form.Dropdown title="Thinking Effort" info={InfoThinking} {...itemProps.thinking}>
        <Form.Dropdown.Item title="None" value={String(ThinkingEffort.None)} key={String(ThinkingEffort.None)} />
        {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
          <Form.Dropdown.Item
            title="Low"
            icon={Icon.StackedBars1}
            value={String(ThinkingEffort.Low)}
            key={String(ThinkingEffort.Low)}
          />
        )}
        {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
          <Form.Dropdown.Item
            title="Medium"
            icon={Icon.StackedBars2}
            value={String(ThinkingEffort.Medium)}
            key={String(ThinkingEffort.Medium)}
          />
        )}
        {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
          <Form.Dropdown.Item
            title="High"
            icon={Icon.StackedBars3}
            value={String(ThinkingEffort.High)}
            key={String(ThinkingEffort.High)}
          />
        )}
      </Form.Dropdown>
      <Form.Dropdown
        title="Action"
        info="Choose what action should be performed when launching this command."
        {...itemProps.action}
      >
        <Form.Dropdown.Item title="Show View" value="view" icon={Icon.Eye} />
        <Form.Dropdown.Item title="Replace Selection" value="replace" icon={Icon.Pencil} />
      </Form.Dropdown>
      <Form.TextArea
        title="Prompt"
        placeholder="Enter custom prompt"
        info={
          "Supports placeholders inside curly braces:\n" +
          "- {selection}: Selected text or clipboard content\n" +
          (props.command === CommandAnswer.TRANSLATE
            ? "- {source}: Source language\n- {target}: Target language\n"
            : "") +
          "- {browser-tab}: Active browser tab content (Raycast Browser Extension required)\n" +
          "- {image}: Image from clipboard or Finder (requires vision model)"
        }
        {...itemProps.prompt}
      />
      {!isCustomServer(itemProps.server.value) && (
        <Form.Checkbox
          id="advanced"
          label="Advanced Settings"
          defaultValue={CheckboxAdvanced}
          onChange={SetCheckboxAdvanced}
        />
      )}
      {!isCustomServer(itemProps.server.value) && CheckboxAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />
      )}
      {props.command === CommandAnswer.TRANSLATE && (
        <React.Fragment>
          <Form.Separator />
          <Form.Description title="note" text="It is highly recommended to use the TranslateGemma model." />
        </React.Fragment>
      )}
    </Form>
  );
}
