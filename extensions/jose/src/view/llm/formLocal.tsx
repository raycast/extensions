import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { LlmHookType } from "../../type/llm";
import { ITalkLlm } from "../../ai/type";

export const LlmFormLocal = (props: { llm?: ITalkLlm; use: { llms: LlmHookType }; name?: string }) => {
  const { use, llm } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ITalkLlm>({
    onSubmit: async (llm) => {
      const updatedItem: ITalkLlm = { ...llm };
      updatedItem.key = `${updatedItem.company}__${updatedItem.model}`;

      if (props.llm?.isLocal != true && props.llm !== undefined) {
        updatedItem.key = props.llm.key;
        updatedItem.url = props.llm.url;
      }

      if (props.llm) {
        use.llms.update({ ...updatedItem });
      } else {
        use.llms.add({ ...updatedItem });
      }
      pop();
    },
    validation: {
      title: FormValidation.Required,
    },
    initialValues: {
      key: llm?.key ?? "",
      title: llm?.title ?? "",
      company: llm?.company ?? "",
      model: llm?.model ?? "",
      apiKeyOrUrl: llm?.apiKeyOrUrl ?? "",
      useLocalOrEnv: llm?.useLocalOrEnv ?? "env",
      url: llm?.url ?? "",
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
      <Form.TextArea title="Title" placeholder="Title your llm" {...itemProps.title} />
      <Form.Dropdown title="Company communication" placeholder="Company communication llm" {...itemProps.company}>
        <Form.Dropdown.Item value="anthropic" key="anthropic" title="Anthropic" />
        <Form.Dropdown.Item value="binary" key="binary" title="Binary file" />
        <Form.Dropdown.Item value="cohere" key="cohere" title="Cohere" />
        <Form.Dropdown.Item value="groq" key="groq" title="Groq" />
        <Form.Dropdown.Item value="ollama" key="ollama" title="Ollama" />
        <Form.Dropdown.Item value="openai" key="openai" title="Openai" />
        <Form.Dropdown.Item value="perplexity" key="perplexity" title="Perplexity" />
      </Form.Dropdown>
      <Form.TextArea title="Model" placeholder="Model your llm" {...itemProps.model} />
      <Form.TextArea title="Api key or url" placeholder="Api key or url your llm" {...itemProps.apiKeyOrUrl} />
      <Form.Dropdown title="Use" placeholder="Use key form" {...itemProps.useLocalOrEnv}>
        <Form.Dropdown.Item value="local" key="local" title="Local configuration llm" />
        <Form.Dropdown.Item value="env" key="env" title="Enviroment extension" />
      </Form.Dropdown>
      <Form.TextArea title="Url" placeholder="Url to download your llm" {...itemProps.url} />
    </Form>
  );
};
