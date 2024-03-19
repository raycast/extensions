import { Action, ActionPanel, Form, getPreferenceValues, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { ConfigurationPreferences, Prompt, PromptHook } from "../type";
import { DestructiveAction } from "./actions";

export const PromptForm = (props: { prompt?: Prompt; hooks: { promptHook: PromptHook }; name?: string }) => {
  const preferences = getPreferenceValues<ConfigurationPreferences>();
  const { hooks, prompt } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Prompt>({
    onSubmit: async (updatedPrompt) => {
      if (typeof updatedPrompt.temperature === "string") {
        updatedPrompt = { ...updatedPrompt, temperature: updatedPrompt.temperature };
      }
      if (prompt) {
        hooks.promptHook.update({ ...updatedPrompt, id: prompt.id });
      } else {
        hooks.promptHook.add(updatedPrompt);
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
      option: prompt?.option ?? preferences.defaultModel,
      system_prompt: prompt?.system_prompt ?? "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          {props.prompt ? (
            <DestructiveAction
              title="Delete"
              dialog={{
                title: "Are you sure you want to delete this prompt?",
              }}
              onAction={() => props.hooks.promptHook.remove(props.prompt as Prompt)}
            />
          ) : undefined}
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name your prompt" {...itemProps.name} />
      <Form.TextArea title="System prompt" placeholder="You are a helpful assistant" {...itemProps.system_prompt} />
      <Form.TextField
        title="Temperature"
        info="This setting influences the variety in the model's responses. Lower values lead to more predictable and typical responses, while higher values encourage more diverse and less common responses. At 0, the model always gives the same response for a given input."
        placeholder="Set your sampling temperature (0 - 2)"
        {...itemProps.temperature}
      />
      <Form.TextField title="Model" placeholder="Name your prompt" {...itemProps.option} />
    </Form>
  );
};
