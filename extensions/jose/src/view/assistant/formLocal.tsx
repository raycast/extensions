import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { AssistantHookType } from "../../type/assistant";
import { ConfigurationTypeCommunication, ConfigurationTypeCommunicationDefault } from "../../type/config";
import { AssistantDefaultTemperature, ITalkAssistant, ITalkLlm, ITalkSnippet } from "../../ai/type";

export const AssistantFormLocal = (props: {
  assistant?: ITalkAssistant;
  use: { assistants: AssistantHookType; snippets: ITalkSnippet[]; llms: ITalkLlm[] };
  name?: string;
}) => {
  const { use, assistant } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ITalkAssistant>({
    onSubmit: async (assistant) => {
      const updatedItem: ITalkAssistant = { ...assistant };

      if (props.assistant?.isLocal != true && props.assistant !== undefined) {
        updatedItem.title = props.assistant.title;
        updatedItem.description = props.assistant.description;
        updatedItem.avatar = props.assistant.avatar;
        updatedItem.emoji = props.assistant.emoji;
        updatedItem.model = props.assistant.model;
        updatedItem.promptSystem = props.assistant.promptSystem;
      }

      if (props.assistant) {
        use.assistants.update({ ...updatedItem, assistantId: props.assistant.assistantId });
      } else {
        use.assistants.add({ ...updatedItem, assistantId: uuidv4() });
      }
      pop();
    },
    validation: {
      title: FormValidation.Required,
    },
    initialValues: {
      title: assistant?.title ?? "",
      description: assistant?.description ?? "",
      avatar: assistant?.avatar ?? "",
      emoji: assistant?.emoji ?? "",
      model: assistant?.model ?? "",
      additionalData: assistant?.additionalData ?? "",
      snippet: assistant?.snippet ?? [],
      promptSystem: assistant?.promptSystem ?? "",
      modelTemperature: assistant?.modelTemperature ?? AssistantDefaultTemperature,
      webhookUrl: assistant?.webhookUrl ?? "",
      typeCommunication: assistant?.typeCommunication ?? ConfigurationTypeCommunicationDefault,
    },
  });

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField title="Title" placeholder="Title your assistant" {...itemProps.title} />
        <Form.TextArea title="Description" placeholder="Description your assistant" {...itemProps.description} />
        <Form.TextArea title="Prompt System" placeholder="PromptSystem your assistant" {...itemProps.promptSystem} />
        <Form.TextField title="Avatar" placeholder="Avatar your assistant" {...itemProps.avatar} />
        <Form.Dropdown title="Emoji" {...itemProps.emoji}>
          {Object.keys(Icon).map((iconName, index) => (
            <Form.Dropdown.Item
              title={iconName}
              value={Object.values(Icon)[index]}
              key={iconName}
              icon={Object.values(Icon)[index]}
            />
          ))}
        </Form.Dropdown>

        <Form.Dropdown
          title="Type communication"
          placeholder="Type communication assistant"
          {...itemProps.typeCommunication}
        >
          {Object.entries(ConfigurationTypeCommunication).map(([, value]) => (
            <Form.Dropdown.Item value={value.key} key={value.key} title={value.title} />
          ))}
        </Form.Dropdown>
        <Form.Dropdown title="Model" placeholder="Choose model" {...itemProps.model}>
          {Object.entries(use.llms).map(([, value]) => (
            <Form.Dropdown.Item value={value.key} key={value.key} title={value.company + " " + value.model} />
          ))}
        </Form.Dropdown>
        <Form.Dropdown title="Temperature" placeholder="Temperature model" {...itemProps.modelTemperature}>
          {Array.from({ length: 10 }, (_, index) => (
            <Form.Dropdown.Item
              value={`${(1 - index / 10).toFixed(1)}`}
              title={`${(1 - index / 10).toFixed(1)}`}
              key={`${(1 - index / 10).toFixed(1)}`}
            />
          ))}
        </Form.Dropdown>

        <Form.TagPicker title="Available snippets" {...itemProps.snippet}>
          {Object.entries(use.snippets).map(([, value]) => (
            <Form.TagPicker.Item
              value={value.snippetId}
              key={value.snippetId}
              title={"(" + value.category + ") " + value.title}
              icon={value.emoji}
            />
          ))}
        </Form.TagPicker>
        <Form.TextArea
          title="Additional data"
          placeholder="Additional data your assistant"
          {...itemProps.additionalData}
        />
      </Form>
    </>
  );
};
