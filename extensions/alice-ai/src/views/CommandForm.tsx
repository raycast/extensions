import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { AvailableModels } from "../lib/OpenAI";
import { useActionsState } from "../store/actions";
import { Action as ActionModel } from "../types";
import { Colors } from "../utils";

interface Props {
  id?: string;
  afterSubmit?: () => void;
}

const initialValues: ActionModel = {
  id: "",
  name: "",
  color: Colors.Blue,
  description: "",
  systemPrompt: "",
  model: "gpt-3.5-turbo",
  temperature: "0.7",
  maxTokens: "-1",
  favorite: false,
};

export default function CommandForm({ id, afterSubmit }: Props) {
  const action = useActionsState((state) => state.actions.find((a) => a.id === id));
  const editAction = useActionsState((state) => state.editAction);
  const addAction = useActionsState((state) => state.addAction);

  const { handleSubmit, itemProps } = useForm({
    initialValues: action || initialValues,
    onSubmit: (values) => {
      if (action && action.id) {
        editAction({ ...values, id: action.id });
        showToast({
          title: "Action updated",
          message: `The action "${values.name}" was successfully updated.`,
          style: Toast.Style.Success,
        });
      } else {
        addAction(values);
        showToast({
          title: "Action created",
          message: `The action "${values.name}" was successfully created.`,
          style: Toast.Style.Success,
        });
      }

      afterSubmit?.();
    },
    validation: {
      color: (value) => {
        if (!value) {
          return "Color is required";
        }
      },
      name: (value) => {
        if (value?.trim().length === 0) {
          return "Name is required";
        }
      },
      systemPrompt: (value) => {
        if (value?.trim().length === 0) {
          return "System Prompt is required";
        }
      },
      model: (value) => {
        if (value?.trim().length === 0) {
          return "Model is required";
        }

        if (value && !AvailableModels[value]) {
          return "Invalid model";
        }
      },
      temperature: (value) => {
        if (value && isNaN(parseFloat(value))) {
          return "Temperature must be a number";
        }
      },
      maxTokens: (value) => {
        if (value && isNaN(parseInt(value))) {
          return "Max Tokens must be a number";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={action ? "Edit Action" : "Create Action"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Color" {...itemProps.color}>
        {Object.entries(Colors).map(([key, value]) => (
          <Form.Dropdown.Item
            key={key}
            value={`${value}`}
            title={key}
            icon={{
              source: Icon.CircleFilled,
              tintColor: value,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="Enter action name" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Enter action description" {...itemProps.description} />
      <Form.TextArea title="System Prompt" placeholder="Enter system prompt" {...itemProps.systemPrompt} />
      {/* @ts-expect-error The type of the model is Model, whereas the event dropdown is always a string. */}
      <Form.Dropdown title="Model" {...itemProps.model}>
        {Object.entries(AvailableModels).map(([model, name]) => (
          <Form.Dropdown.Item key={model} value={model} title={name} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Temperature" placeholder="Enter temperature" {...itemProps.temperature} />
      <Form.TextField
        title="Max Tokens"
        placeholder="Enter max tokens"
        info="The maximum number of tokens to generate. Set -1 for unlimited."
        {...itemProps.maxTokens}
      />
    </Form>
  );
}
