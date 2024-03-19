import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { CSVPrompt, Prompt, PromptHook } from "../../type";
import { apiPreferences } from "../../utils";

export const PromptForm = (props: { prompt?: Prompt; use: { prompts: PromptHook }; name?: string }) => {
  const { use, prompt } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValue } = useForm<Prompt>({
    onSubmit: async (prompt) => {
      let updatedPrompt: Prompt = { ...prompt, updated_at: new Date().toISOString() };
      if (typeof updatedPrompt.temperature === "string") {
        updatedPrompt = { ...updatedPrompt, temperature: updatedPrompt.temperature };
      }
      if (props.prompt) {
        use.prompts.update({ ...updatedPrompt, id: props.prompt.id, created_at: props.prompt.created_at });
      } else {
        use.prompts.add({
          ...updatedPrompt,
          id: uuidv4(),
          created_at: new Date().toISOString(),
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
      name: prompt?.name ?? "",
      temperature: prompt?.temperature.toString() ?? "1",
      option: prompt?.option ?? "openrouter/auto",
      prompt: prompt?.prompt ?? "",
    },
  });

  const MODEL_OPTIONS = use.prompts.option;

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
      <Form.TextField title="Name" placeholder="Name your prompt" {...itemProps.name} />
      <Form.TextArea title="System prompt" placeholder="You are a helpful assistant" {...itemProps.prompt} />
      <Form.TextField
        title="Temperature"
        info="This setting influences the variety in the model's responses. Lower values lead to more predictable and typical responses, while higher values encourage more diverse and less common responses. At 0, the model always gives the same response for a given input."
        placeholder="Set your sampling temperature (0 - 2)"
        {...itemProps.temperature}
      />
      <Form.Dropdown title="Model" info="Select a model" placeholder="Choose model option" {...itemProps.option}>
        <Form.Dropdown.Section title={apiPreferences().name}>
          {MODEL_OPTIONS.map((option) => (
            <Form.Dropdown.Item value={option} title={option} key={option} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
};
