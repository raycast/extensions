import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Model, ModelHook } from "../../type";

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Model>({
    onSubmit: async (model) => {
      let updatedModel: Model = { ...model, updated_at: new Date().toISOString() };
      if (typeof updatedModel.temperature === "string") {
        updatedModel = { ...updatedModel, temperature: Number(updatedModel.temperature) };
      }
      if (props.model) {
        const toast = await showToast({
          title: "Update your model...",
          style: Toast.Style.Animated,
        });
        use.models.update({ ...updatedModel, id: props.model.id, created_at: props.model.created_at });
        toast.title = "Model updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Save your model...",
          style: Toast.Style.Animated,
        });
        use.models.add({ ...updatedModel, id: data.id, created_at: data.created_at });
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
        if (value) {
          if (value < 0) {
            return "Minimal value is 0";
          } else if (value > 2) {
            return "Maximal value is 2";
          }
        } else {
          return FormValidation.Required;
        }
      },
    },
  });

  const [data, setData] = useState<Model>(
    props?.model ?? {
      id: uuidv4(),
      updated_at: "",
      created_at: new Date().toISOString(),
      name: props?.name ?? "",
      prompt: "",
      option: "gpt-3.5-turbo",
      temperature: 1,
      pinned: false,
    }
  );

  const MODEL_OPTIONS = use.models.option;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="Name your model"
        defaultValue={data.name}
        onChange={(value) => setData({ ...data, name: value })}
        {...itemProps.name}
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe your prompt"
        defaultValue={data.prompt}
        onChange={(value) => setData({ ...data, prompt: value })}
      />
      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 2)"
        defaultValue={data.temperature.toLocaleString()}
        onChange={(value) => {
          setData({ ...data, temperature: Number(value) });
        }}
        {...itemProps.temperature}
      />
      <Form.Dropdown
        id="option"
        title="Model"
        placeholder="Choose model option"
        defaultValue={data.option}
        onChange={(value) => setData({ ...data, option: value, updated_at: new Date().toISOString() })}
      >
        {MODEL_OPTIONS.map((option) => (
          <Form.Dropdown.Item value={option} title={option} key={option} />
        ))}
      </Form.Dropdown>
      {data.id !== "default" && (
        <Form.Checkbox
          id="pinned"
          title="Pinned"
          label="Pin model"
          defaultValue={data.pinned}
          onChange={(value) => setData({ ...data, pinned: value })}
        />
      )}
    </Form>
  );
};
