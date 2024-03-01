import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { CSVPrompt, Model, ModelHook } from "../../type";
import { parse } from "csv-parse/sync";
import { getConfiguration } from "../../hooks/useChatGPT";

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValue } = useForm<Model>({
    onSubmit: async (model) => {
      let updatedModel: Model = { ...model, updated_at: new Date().toISOString() };
      if (typeof updatedModel.temperature === "string") {
        updatedModel = { ...updatedModel, temperature: updatedModel.temperature };
      }
      const { provider } = getConfiguration();
      if (props.model) {
        const toast = await showToast({
          title: "Update your model...",
          style: Toast.Style.Animated,
        });
        use.models.update({ ...updatedModel, id: props.model.id, created_at: props.model.created_at, provider });
        toast.title = "Model updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Save your model...",
          style: Toast.Style.Animated,
        });
        use.models.add({
          ...updatedModel,
          id: uuidv4(),
          created_at: new Date().toISOString(),
          provider,
        });
        await showToast({
          title: "Model saved",
          style: Toast.Style.Animated,
        });
      }
      pop();
    },
    validation: {
      name: FormValidation.Required,
      temperature: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            if (numValue < 0) {
              return "Minimal value is 0";
            } else if (numValue > 2) {
              return "Maximal value is 2";
            }
          }
        } else {
          return FormValidation.Required;
        }
      },
    },
    initialValues: {
      name: model?.name ?? "",
      temperature: model?.temperature.toString() ?? "1",
      option: model?.option,
      prompt: model?.prompt ?? "You are a helpful assistant.",
      pinned: model?.pinned ?? false,
    },
  });

  const MODEL_OPTIONS = use.models.option;

  const { isLoading, data } = useFetch<CSVPrompt[]>(
    "https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv",
    {
      parseResponse: async (response) => {
        const text = await response.text();
        return parse(text, {
          columns: true,
        });
      },
      keepPreviousData: true,
    }
  );

  function replacePrompt(value: string) {
    if (value !== "none") {
      setValue("prompt", value);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name your model" {...itemProps.name} />
      <Form.Dropdown
        id="template"
        title="Awesome Prompts"
        isLoading={isLoading}
        defaultValue="none"
        onChange={replacePrompt}
      >
        <Form.Dropdown.Item value="none" title="Choose an Awesome ChatGPT Prompts" icon={"🧠"} />
        {(data || []).map((prompt) => (
          <Form.Dropdown.Item value={prompt.prompt} title={prompt.act} key={prompt.prompt} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Prompt" placeholder="Describe your prompt" {...itemProps.prompt} />
      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 2)"
        {...itemProps.temperature}
      />
      <Form.Dropdown title="Model" placeholder="Choose model option" {...itemProps.option}>
        {MODEL_OPTIONS.map((option) => (
          <Form.Dropdown.Item value={option} title={option} key={option} />
        ))}
      </Form.Dropdown>
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
    </Form>
  );
};
