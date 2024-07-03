import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { AssistantDefaultTemperature, AssistantHookType } from "../../type/assistant";
import {
  ConfigurationModelCollection,
  ConfigurationModelDefault,
  ConfigurationTypeCommunication,
  ConfigurationTypeCommunicationDefault,
} from "../../type/config";
import { TalkAssistantType, TalkSnippetType } from "../../type/talk";

export const AssistantForm = (props: {
  assistant?: TalkAssistantType;
  use: { assistants: AssistantHookType; snippets: TalkSnippetType[] };
  name?: string;
}) => {
  const { use, assistant } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<TalkAssistantType>({
    onSubmit: async (assistant) => {
      const updatedItem: TalkAssistantType = { ...assistant };

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
      model: assistant?.model ?? ConfigurationModelDefault,
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
        <Form.Dropdown title="Temperature" placeholder="Temperature model" {...itemProps.modelTemperature}>
          {Array.from({ length: 10 }, (_, index) => (
            <Form.Dropdown.Item
              value={`${(1 - index / 10).toFixed(1)}`}
              title={`${(1 - index / 10).toFixed(1)}`}
              key={`${(1 - index / 10).toFixed(1)}`}
            />
          ))}
        </Form.Dropdown>
        {/* <Form.TextField title="Webhook" placeholder="Url to send response" {...itemProps.webhookUrl} /> */}
        <Form.Dropdown
          title="Type communication"
          placeholder="Type communication assistant"
          {...itemProps.typeCommunication}
        >
          {Object.entries(ConfigurationTypeCommunication).map(([, value]) => (
            <Form.Dropdown.Item value={value.key} key={value.key} title={value.title} />
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
        <Form.Separator />
        <Form.TextField title="Title" placeholder="Title your assistant" {...itemProps.title} />
        <Form.TextArea title="Description" placeholder="Description your assistant" {...itemProps.description} />
        <Form.TextField title="Avatar" placeholder="Avatar your assistant" {...itemProps.avatar} />
        <Form.TextField title="Emoji" placeholder="Emoji your assistant" {...itemProps.emoji} />

        <Form.Dropdown title="Model" placeholder="Choose model" {...itemProps.model}>
          {Object.entries(ConfigurationModelCollection).map(([, value]) => (
            <Form.Dropdown.Item value={value.key} key={value.key} title={value.title} />
          ))}
        </Form.Dropdown>

        <Form.TextArea title="Prompt System" placeholder="PromptSystem your assistant" {...itemProps.promptSystem} />
      </Form>
    </>
  );
};
