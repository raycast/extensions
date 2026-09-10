import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import type { Command, CommandContentSource, CommandHook, Model, ReasoningEffort } from "../../type";
import { useModelCatalog } from "../../hooks/useModelCatalog";
import { ModelForm } from "../model/form";
import { ModelField } from "../model/model-field";
import { DEFAULT_MODEL } from "../../utils/model-defaults";
import { resolveCommandSettings } from "../../utils/command-settings";
import { validateTemperature } from "../../utils/model-validation";

type CommandFormProps = {
  cmd?: Command;
  name?: string;
  isNew?: boolean;
  baseModelId?: string;
  onSaved?: (command: Command) => void;
  use: { commands: CommandHook };
};

export function CommandForm(props: CommandFormProps) {
  const { catalog, isLoading } = useModelCatalog();
  if (isLoading) return <Detail isLoading markdown="" />;
  return <CommandFields {...props} models={catalog.models} />;
}

type CommandValues = Required<Omit<Command, "id" | "created_at" | "updated_at">>;
const settingOverrides = {
  model: "overrideModel",
  temperature: "overrideTemperature",
  enableReasoningEffortChange: "overrideReasoning",
  reasoningEffort: "overrideReasoning",
  vision: "overrideVision",
  prompt: "overridePrompt",
} as const;
type Setting = keyof typeof settingOverrides;
type Override = (typeof settingOverrides)[Setting];
const overrideTitles: Record<Override, string> = {
  overrideModel: "Model",
  overrideTemperature: "Temperature",
  overrideReasoning: "Reasoning",
  overrideVision: "Vision",
  overridePrompt: "Prompt",
};

function CommandFields(props: CommandFormProps & { models: Record<string, Model> }) {
  const { cmd, models } = props;
  const navigation = useNavigation();
  const initialSettings = cmd
    ? resolveCommandSettings(cmd, models[cmd.baseModelId ?? ""])
    : (models[props.baseModelId ?? "default"] ?? DEFAULT_MODEL);
  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<CommandValues>({
    initialValues: {
      name: cmd?.name ?? props.name ?? "",
      configurationMode: props.baseModelId ? "inherit" : cmd ? (cmd.configurationMode ?? "inherit") : "independent",
      baseModelId: props.baseModelId ?? cmd?.baseModelId ?? "default",
      model: initialSettings.option,
      temperature: initialSettings.temperature,
      enableReasoningEffortChange: initialSettings.enableReasoningEffortChange,
      reasoningEffort: initialSettings.reasoningEffort,
      vision: initialSettings.vision ?? false,
      overrideModel: cmd?.overrideModel ?? false,
      overrideTemperature: cmd?.overrideTemperature ?? false,
      overrideReasoning: cmd?.overrideReasoning ?? false,
      overrideVision: cmd?.overrideVision ?? false,
      overridePrompt: cmd?.overridePrompt ?? false,
      prompt: initialSettings.prompt,
      contentSource: cmd?.contentSource ?? "selectedText",
      isDisplayInput: cmd?.isDisplayInput ?? false,
    },
    validation: {
      name: (name) => (name?.trim() ? undefined : "Enter a command name"),
      baseModelId: (id): string | undefined =>
        values.configurationMode === "inherit" && (!id || !models[id]) ? "Choose an existing model" : undefined,
      model: (model): string | undefined =>
        (values.configurationMode === "independent" || values.overrideModel) && !model?.trim()
          ? "Enter a model name"
          : undefined,
      temperature: (temperature): string | undefined =>
        values.configurationMode === "independent" || values.overrideTemperature
          ? validateTemperature(temperature)
          : undefined,
    },
    onSubmit: async (values) => {
      const command: Command = {
        ...values,
        name: values.name.trim(),
        id: cmd && !props.isNew ? cmd.id : uuidv4(),
        baseModelId: values.configurationMode === "inherit" ? values.baseModelId : undefined,
        model: values.model.trim(),
      };
      try {
        if (cmd && !props.isNew) await props.use.commands.update(command);
        else await props.use.commands.add(command);
        props.onSaved?.(command);
        navigation.pop();
      } catch {
        // The store reports failures; keep the draft open for retry.
      }
    },
  });
  const base = models[values.baseModelId];
  const inherits = values.configurationMode === "inherit";
  const settings = resolveCommandSettings({ ...values, id: cmd?.id ?? "" }, base ?? DEFAULT_MODEL);
  const effective: Pick<CommandValues, Setting> = {
    ...settings,
    model: settings.option,
    vision: settings.vision ?? false,
  };
  const changedSettings = (Object.keys(overrideTitles) as Override[]).filter((key) => values[key]);
  const changeSetting = <K extends Setting>(key: K, value: CommandValues[K]) => {
    if (value === effective[key]) return;
    const override = settingOverrides[key];
    if (inherits) {
      if (override === "overrideReasoning") {
        setValue("enableReasoningEffortChange", effective.enableReasoningEffortChange);
        setValue("reasoningEffort", effective.reasoningEffort);
      }
      setValue(override, true);
    }
    setValue(key, value);
    setValidationError(key, undefined);
  };
  const restoreSetting = (override: Override) => {
    setValue(override, false);
    for (const field of Object.keys(settingOverrides) as Setting[]) {
      if (settingOverrides[field] === override) setValidationError(field, undefined);
    }
  };
  const settingInfo = (key: Setting) =>
    inherits
      ? values[settingOverrides[key]]
        ? "Customized for this command. Use the action menu to restore inheritance."
        : `Inherited from ${base?.name ?? "the base model"}. Editing only changes this command.`
      : undefined;
  const changeMode = (mode: string) => {
    if (mode === "independent" && inherits && base) {
      setValue("model", effective.model);
      setValue("temperature", effective.temperature);
      setValue("enableReasoningEffortChange", effective.enableReasoningEffortChange);
      setValue("reasoningEffort", effective.reasoningEffort);
      setValue("vision", effective.vision ?? false);
      setValue("prompt", effective.prompt);
    }
    setValue("configurationMode", mode as CommandValues["configurationMode"]);
    setValidationError("model", undefined);
    setValidationError("temperature", undefined);
    setValidationError("baseModelId", undefined);
  };
  return (
    <Form
      navigationTitle={cmd && !props.isNew ? "Edit AI Command" : "Create AI Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save AI Command"
            icon={Icon.SaveDocument}
            onSubmit={(submitted) => handleSubmit({ ...values, ...submitted })}
          />
          {inherits && changedSettings.length > 0 && (
            <ActionPanel.Section title="Restore Inheritance">
              {changedSettings.map((key) => (
                <Action
                  key={key}
                  title={`Reset ${overrideTitles[key]} to Base`}
                  icon={Icon.RotateAntiClockwise}
                  onAction={() => restoreSetting(key)}
                />
              ))}
              {changedSettings.length > 1 && (
                <Action
                  title="Restore All Inherited Settings"
                  icon={Icon.RotateAntiClockwise}
                  onAction={() => changedSettings.forEach(restoreSetting)}
                />
              )}
            </ActionPanel.Section>
          )}
          {inherits && base && (
            <Action
              title="Edit Base Model"
              icon={Icon.Pencil}
              onAction={() => navigation.push(<ModelForm model={base} />)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Command name" {...itemProps.name} />
      <Form.Dropdown
        title="Model Configuration"
        id="configurationMode"
        value={values.configurationMode}
        onChange={changeMode}
      >
        <Form.Dropdown.Item value="independent" title="Independent Configuration" />
        <Form.Dropdown.Item value="inherit" title="Inherit from a Model" />
      </Form.Dropdown>
      {inherits && (
        <Form.Dropdown
          title="Base Model"
          {...itemProps.baseModelId}
          info="Edit any setting below to customize it for this command. Use the action menu to restore inherited values."
        >
          {Object.values(models).map((model) => (
            <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
          ))}
        </Form.Dropdown>
      )}
      <ModelField
        {...itemProps.model}
        value={effective.model}
        onChange={(value) => changeSetting("model", value)}
        info={settingInfo("model")}
      />
      <Form.TextField
        title="Temperature"
        placeholder="0 - 2"
        {...itemProps.temperature}
        value={effective.temperature}
        onChange={(value) => changeSetting("temperature", value)}
        info={settingInfo("temperature")}
      />
      <Form.Checkbox
        title="Reasoning"
        label="Enable reasoning effort change"
        {...itemProps.enableReasoningEffortChange}
        value={effective.enableReasoningEffortChange}
        onChange={(value) => changeSetting("enableReasoningEffortChange", value)}
        info={settingInfo("enableReasoningEffortChange")}
      />
      {effective.enableReasoningEffortChange && (
        <Form.Dropdown
          title="Effort"
          id="reasoningEffort"
          value={effective.reasoningEffort}
          onChange={(value) => changeSetting("reasoningEffort", value as ReasoningEffort)}
          info={settingInfo("reasoningEffort")}
        >
          {(["none", "low", "medium", "high"] as const).map((effort) => (
            <Form.Dropdown.Item value={effort} title={effort} key={effort} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Checkbox
        title="Vision"
        label="Enable vision capabilities"
        {...itemProps.vision}
        value={effective.vision}
        onChange={(value) => changeSetting("vision", value)}
        info={settingInfo("vision")}
      />
      <Form.TextArea
        title="Prompt"
        placeholder="Describe what your command should do"
        {...itemProps.prompt}
        value={effective.prompt}
        onChange={(value) => changeSetting("prompt", value)}
        info={settingInfo("prompt")}
      />
      <Form.Separator />
      <Form.Dropdown
        title="Content Source"
        id="contentSource"
        value={itemProps.contentSource.value}
        onChange={(value) => itemProps.contentSource.onChange?.(value as CommandContentSource)}
      >
        {(Object.keys(titlesByContentSource) as CommandContentSource[]).map((key) => (
          <Form.Dropdown.Item
            key={key}
            value={key}
            title={titlesByContentSource[key]}
            icon={iconsByContentSource[key]}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        title="Display Input"
        label="Show the original input with the result"
        {...itemProps.isDisplayInput}
      />
    </Form>
  );
}

export const titlesByContentSource = {
  clipboard: "Clipboard Text",
  selectedText: "Selected Text",
  browserTab: "Focused Browser Tab",
};

export const iconsByContentSource = {
  clipboard: Icon.Clipboard,
  selectedText: Icon.TextSelection,
  browserTab: Icon.Globe,
};
