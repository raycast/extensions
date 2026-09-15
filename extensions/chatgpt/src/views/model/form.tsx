import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { CSVPrompt, Model, ReasoningEffort } from "../../type";
import { parse } from "csv-parse/sync";
import { useCallback, useState } from "react";
import { useModel } from "../../hooks/useModel";
import { ModelField } from "./model-field";
import { validateTemperature } from "../../utils/model-validation";

export const ModelForm = (props: { model?: Model; name?: string; onSaved?: (model: Model) => void }) => {
  const { model } = props;
  const models = useModel();
  const { pop } = useNavigation();
  const reasoningEffortOptions: ReasoningEffort[] = ["none", "low", "medium", "high"];

  const { handleSubmit, itemProps, setValue } = useForm<Model>({
    onSubmit: async (values) => {
      const updatedModel: Model = {
        ...values,
        id: model?.id ?? uuidv4(),
        created_at: model?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      try {
        if (model) await models.update(updatedModel);
        else await models.add(updatedModel);
        props.onSaved?.(updatedModel);
        pop();
      } catch {
        // Keep the draft open when persistence fails.
      }
    },
    validation: {
      name: FormValidation.Required,
      option: FormValidation.Required,
      temperature: validateTemperature,
    },
    initialValues: {
      name: model?.name ?? props.name ?? "",
      temperature: model?.temperature.toString() ?? "1",
      option: model?.option ?? "gpt-5-nano",
      prompt: model?.prompt ?? "You are a helpful assistant.",
      enableReasoningEffortChange: model?.enableReasoningEffortChange ?? false,
      reasoningEffort: model?.reasoningEffort ?? "medium",
      pinned: model?.pinned ?? false,
      vision: model?.vision ?? false,
    },
  });

  const [showAwesomePrompts, setShowAwesomePrompts] = useState(false);

  const { isLoading, data } = useFetch<CSVPrompt[]>(
    "https://raw.githubusercontent.com/awesome-chatgpt-prompts/awesome-chatgpt-prompts-github/awesome-chatgpt-prompts/prompts.csv",
    {
      parseResponse: async (response) => {
        try {
          const text = await response.text();
          return parse(text, {
            columns: true,
            skipEmptyLines: true,
            skipRecordsWithError: true,
            skipRecordsWithEmptyValues: true,
          });
        } catch {
          return [];
        }
      },
      keepPreviousData: true,
      execute: showAwesomePrompts,
    },
  );

  const setPrompt = useCallback(
    (value: string) => {
      if (value !== "none") {
        setValue("prompt", value);
      }
    },
    [setValue],
  );

  return (
    <Form
      navigationTitle={model ? "Edit Model" : "Create Model"}
      isLoading={models.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action
            title="Toggle Awesome Prompts"
            icon={{ source: "🧠" }}
            onAction={() => setShowAwesomePrompts((s) => !s)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name your model" {...itemProps.name} />
      {showAwesomePrompts && (
        <Form.Dropdown
          id="template"
          title="Awesome Prompts"
          isLoading={isLoading}
          defaultValue="none"
          onChange={setPrompt}
        >
          <Form.Dropdown.Item value="none" title="Choose an Awesome ChatGPT Prompts" icon={"🧠"} />
          {(data || []).map((prompt) => (
            <Form.Dropdown.Item value={prompt.prompt} title={prompt.act} key={prompt.prompt} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        title="Prompt"
        placeholder="Describe your prompt"
        {...itemProps.prompt}
        info="If you encounter issues while using certain models(o1-mini, o1-preview, etc.), you can leave this item blank."
      />
      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 2)"
        {...itemProps.temperature}
      />
      <Form.Checkbox
        id="enableReasoningEffortChange"
        title="Reasoning"
        label="Enable reasoning effort change"
        value={itemProps.enableReasoningEffortChange.value}
        onChange={(value) => {
          itemProps.enableReasoningEffortChange.onChange?.(value);
          if (value) {
            setValue("reasoningEffort", "medium");
          }
        }}
      />
      {itemProps.enableReasoningEffortChange.value && (
        <Form.Dropdown
          id="reasoningEffort"
          title="Effort"
          placeholder="Choose reasoning effort"
          value={itemProps.reasoningEffort.value}
          error={itemProps.reasoningEffort.error}
          onChange={(value) => itemProps.reasoningEffort.onChange?.(value as ReasoningEffort)}
        >
          {reasoningEffortOptions.map((effort) => (
            <Form.Dropdown.Item value={effort} title={effort} key={effort} />
          ))}
        </Form.Dropdown>
      )}
      <ModelField {...itemProps.option} />

      <Form.Checkbox title="Vision" label="Enable vision capabilities" {...itemProps.vision} />
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
    </Form>
  );
};
