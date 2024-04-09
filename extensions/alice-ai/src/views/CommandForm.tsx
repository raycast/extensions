import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { MODEL } from "../lib/OpenAI";
import { useActionsState } from "../store/actions";
import { Action as IAction } from "../types";

interface Props {
  id?: string;
}

const initialValues: IAction = {
  id: "",
  name: "",
  description: "",
  systemPrompt: "",
  model: "gpt-3.5-turbo",
  temperature: "0.7",
  maxTokens: "-1",
};

export default function CommandForm({ id }: Props) {
  const navigation = useNavigation();
  const action = useActionsState((state) => state.actions.find((a) => a.id === id));
  const editAction = useActionsState((state) => state.editAction);
  const addAction = useActionsState((state) => state.addAction);

  const { handleSubmit, itemProps } = useForm({
    initialValues: action || initialValues,
    onSubmit: (values) => {
      if (action && action.id) {
        editAction({ ...values, id: action.id });
      } else {
        addAction(values);
      }

      navigation.pop();
    },
    validation: {
      name: (value) => {
        if (value?.trim().length === 0) {
          return "Name is required";
        }
      },
      description: (value) => {
        if (value?.trim().length === 0) {
          return "Description is required";
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

        if (value && !MODEL[value]) {
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
      <Form.TextField title="Name" placeholder="Enter action name" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Enter action description" {...itemProps.description} />
      <Form.TextArea title="System Prompt" placeholder="Enter system prompt" {...itemProps.systemPrompt} />
      <Form.Dropdown title="Model" {...itemProps.model}>
        {Object.entries(MODEL).map(([model, name]) => (
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
