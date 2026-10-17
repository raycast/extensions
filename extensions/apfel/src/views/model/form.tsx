import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { Model, ModelHook } from "../../type";

const MAX_TOKENS = 4096;

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Model>({
    onSubmit: async (model) => {
      const updatedModel: Model = {
        ...model,
        updated_at: new Date().toISOString(),
      };

      if (props.model) {
        const toast = await showToast({
          title: "Updating model...",
          style: Toast.Style.Animated,
        });

        use.models.update({
          ...updatedModel,
          id: props.model.id,
          created_at: props.model.created_at,
        });

        toast.title = "Model updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Saving model...",
          style: Toast.Style.Animated,
        });

        use.models.add({
          ...updatedModel,
          id: uuidv4(),
          created_at: new Date().toISOString(),
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
        if (value === undefined || value === null || value === "") {
          return "Temperature is required";
        }
        const numValue = Number(value);

        if (Number.isNaN(numValue)) {
          return "Temperature must be a number";
        }
        if (numValue < 0) {
          return "Minimum value is 0";
        }
        if (numValue > 1) {
          return "Maximum value is 1";
        }
        return undefined;
      },
      max_tokens: (value) => {
        if (value === undefined || value === null || value === "") {
          return "Max tokens is required";
        }
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return "Max tokens must be a number";
        }
        if (numValue % 1 !== 0) {
          return "Value must be an integer";
        }
        if (numValue < 0) {
          return "Minimal value is 0";
        }

        if (numValue > MAX_TOKENS) {
          return `Maximum value is ${MAX_TOKENS}`;
        }
        return undefined; // Valid input
      },
    },
    initialValues: {
      name: model?.name ?? "",
      prompt: model?.prompt ?? "You are a useful assistant",
      pinned: model?.pinned ?? false,
      temperature: model?.temperature.toString() ?? "1",
      max_tokens: model?.max_tokens ?? `${MAX_TOKENS}`,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name your model" {...itemProps.name} />
      <Form.TextArea title="Prompt" placeholder="Describe your prompt" {...itemProps.prompt} />

      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 1)"
        {...itemProps.temperature}
      />

      <Form.TextField
        title="Max token output"
        placeholder="Set the maximum number of tokens to generate"
        info={`Maximum ${MAX_TOKENS} tokens allowed`}
        {...itemProps.max_tokens}
      />
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
    </Form>
  );
};
