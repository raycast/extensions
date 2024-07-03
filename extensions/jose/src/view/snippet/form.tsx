import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { SnippetDefaultTemperature, SnippetHookType } from "../../type/snippet";
import {
  ConfigurationModelCollection,
  ConfigurationModelDefault,
  ConfigurationTypeCommunication,
  ConfigurationTypeCommunicationDefault,
} from "../../type/config";
import { TalkSnippetType } from "../../type/talk";

export const SnippetForm = (props: {
  snippet?: TalkSnippetType;
  use: { snippets: SnippetHookType };
  name?: string;
}) => {
  const { use, snippet } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<TalkSnippetType>({
    onSubmit: async (snippet) => {
      const updatedItem: TalkSnippetType = { ...snippet };

      if (props.snippet?.isLocal != true && props.snippet !== undefined) {
        updatedItem.title = props.snippet.title;
        updatedItem.category = props.snippet.category;
        updatedItem.emoji = props.snippet.emoji;
        updatedItem.model = props.snippet.model;
        updatedItem.promptSystem = props.snippet.promptSystem;
      }

      if (props.snippet) {
        use.snippets.update({ ...updatedItem, snippetId: props.snippet.snippetId });
      } else {
        use.snippets.add({ ...updatedItem, snippetId: uuidv4() });
      }
      pop();
    },
    validation: {
      title: FormValidation.Required,
    },
    initialValues: {
      title: snippet?.title ?? "",
      category: snippet?.category ?? "",
      emoji: snippet?.emoji ?? "",
      model: snippet?.model ?? ConfigurationModelDefault,
      promptSystem: snippet?.promptSystem ?? "",
      modelTemperature: snippet?.modelTemperature ?? SnippetDefaultTemperature,
      webhookUrl: snippet?.webhookUrl ?? "",
      typeCommunication: snippet?.typeCommunication ?? ConfigurationTypeCommunicationDefault,
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
      <Form.Dropdown title="Temperature" placeholder="Temperature model" {...itemProps.modelTemperature}>
        {Array.from({ length: 10 }, (_, index) => (
          <Form.Dropdown.Item
            value={`${(1 - index / 10).toFixed(1)}`}
            title={`${(1 - index / 10).toFixed(1)}`}
            key={`${(1 - index / 10).toFixed(1)}`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Webhook" placeholder="Url to send response" {...itemProps.webhookUrl} />
      <Form.Dropdown
        title="Type communication"
        placeholder="Type communication snippet"
        {...itemProps.typeCommunication}
      >
        {Object.entries(ConfigurationTypeCommunication).map(([, value]) => (
          <Form.Dropdown.Item value={value.key} key={value.key} title={value.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Title" placeholder="Title your snippet" {...itemProps.title} />
      <Form.TextField title="Category" placeholder="Category your snippet" {...itemProps.category} />
      <Form.TextField title="Emoji" placeholder="Emoji your snippet" {...itemProps.emoji} />

      <Form.Dropdown title="Model" placeholder="Choose model" {...itemProps.model}>
        {Object.entries(ConfigurationModelCollection).map(([, value]) => (
          <Form.Dropdown.Item value={value.key} key={value.key} title={value.title} />
        ))}
      </Form.Dropdown>

      <Form.TextArea title="Prompt" placeholder="Prompt your snippet" {...itemProps.promptSystem} />
    </Form>
  );
};
