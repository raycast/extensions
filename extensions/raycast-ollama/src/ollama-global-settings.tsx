import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { GetModels, isThinkingModel } from "./lib/ui/function";
import { ThinkingEffort } from "./lib/enum";
import { ValidationKeepAlive, ValidationThinking } from "./lib/ui/valitadion";
import { GetGlobalDefaultModel, SetGlobalDefaultModel } from "./lib/settings/settings";

interface FormData {
  server: string;
  model: string;
  thinking: string;
  keep_alive: string;
}

export default function GlobalSettings(): React.JSX.Element {
  const InfoThinking = "Thinking Effort";
  const InfoKeepAlive = "Keep model loaded in memory for this duration (e.g., 5m, 1h, 24h)";

  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: () => {
      // Load current global defaults from preferences
      // Note: We can't directly read preferences here, but we can pre-fill from the form's initialValues
    },
  });

  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      server: "Local",
      model: "",
      thinking: "none",
      keep_alive: "5m",
    },
    validation: {
      server: FormValidation.Required,
      model: FormValidation.Required,
      thinking: ValidationThinking,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
    },
  });

  // Load current global defaults
  React.useEffect(() => {
    const loadDefaults = async () => {
      const defaults = await GetGlobalDefaultModel();
      setValue("server", defaults.server);
      setValue("model", defaults.model);
      setValue("thinking", defaults.thinking);
      setValue("keep_alive", defaults.keepAlive);
    };
    loadDefaults();
  }, []);

  const [CheckboxAdvanced, SetCheckboxAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  // Initialize CheckboxAdvanced from loaded keep_alive
  React.useEffect(() => {
    const initAdvanced = async () => {
      const defaults = await GetGlobalDefaultModel();
      SetCheckboxAdvanced(defaults.keepAlive !== "5m");
    };
    initAdvanced();
  }, []);

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => {}} />
    </ActionPanel>
  );

  async function Submit(values: FormData): Promise<void> {
    await SetGlobalDefaultModel({
      server: values.server,
      model: values.model,
      thinking: values.thinking,
      keepAlive: CheckboxAdvanced ? values.keep_alive : "5m",
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Global Defaults Saved",
      message: "Defaults updated successfully",
    });
  }

  return (
    <Form actions={ActionView} isLoading={IsLoadingModel}>
      {!IsLoadingModel && Model && (
        <React.Fragment>
          <Form.Dropdown title="Default Server" {...itemProps.server}>
            {[...Model.keys()].sort().map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Default Model" {...itemProps.model}>
            {itemProps.server.value && Model.get(itemProps.server.value) ? (
              Model.get(itemProps.server.value)
                ?.sort()
                ?.map((s) => <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />)
            ) : (
              <Form.Dropdown.Item title="Select a server first" value="" />
            )}
          </Form.Dropdown>
          <Form.Dropdown title="Default Thinking Effort" info={InfoThinking} {...itemProps.thinking}>
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
          <Form.Checkbox
            id="advanced"
            label="Advanced Settings"
            defaultValue={CheckboxAdvanced}
            onChange={SetCheckboxAdvanced}
          />
          {CheckboxAdvanced && (
            <Form.TextField title="Default Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />
          )}
          <Form.Separator />
          <Form.Description
            title="Note"
            text="These global defaults are used by all commands unless a command has its own custom model settings configured via 'Change Model' in the command's action panel."
          />
          <Form.Description
            title="Tip"
            text="Set these values in Raycast Preferences → Extensions → Ollama AI. The dropdowns above show available servers/models for reference."
          />
        </React.Fragment>
      )}
    </Form>
  );
}
