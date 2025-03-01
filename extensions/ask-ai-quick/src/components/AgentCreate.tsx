import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useAgents, AgentFormValues } from "../lib/hooks";

export default function AgentCreate() {
  const navigation = useNavigation();
  const { agents, addAgent, isLoading } = useAgents();
  const { handleSubmit, itemProps } = useForm<AgentFormValues>({
    async onSubmit(values) {
      if (agents?.find((item) => item.name === values.name)) {
        await showToast(Toast.Style.Failure, "Agent with this name already exists");
        return;
      }

      await addAgent(values);
      await showToast(Toast.Style.Success, "Agent created successfully");
      navigation.pop();
    },
    initialValues: {
      model: "Default",
    },
    validation: {
      name: FormValidation.Required,
      prompt: FormValidation.Required,
      model: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="My Agent" {...itemProps.name} />
      <Form.TextArea title="Prompt" placeholder="" {...itemProps.prompt} />
      <Form.Dropdown title="Model" {...itemProps.model}>
        <Form.Dropdown.Item value="Default" title="Default" icon="🤖" />
      </Form.Dropdown>
    </Form>
  );
}
