import { List } from "@raycast/api";
import { ConfigurationModelCollection, ConfigurationTypeCommunication } from "../../type/config";
import { ITalkAssistant, ITalkSnippet } from "../../ai/type";

export const AssistantListView = ({
  title,
  assistants,
  snippets,
  selectedAssistant,
  actionPanel,
}: {
  title: string;
  assistants: ITalkAssistant[];
  snippets: ITalkSnippet[];
  selectedAssistant: string | null;
  actionPanel: (assistant: ITalkAssistant) => JSX.Element;
}) => (
  <List.Section title={title} subtitle={assistants.length.toLocaleString()}>
    {assistants.map((assistant: ITalkAssistant) => (
      <AssistantListItem
        key={assistant.assistantId}
        assistant={assistant}
        snippets={snippets}
        selectedAssistant={selectedAssistant}
        actionPanel={actionPanel}
      />
    ))}
  </List.Section>
);

const AssistantListItem = ({
  assistant,
  snippets,
  selectedAssistant,
  actionPanel,
}: {
  assistant: ITalkAssistant;
  snippets: ITalkSnippet[];
  selectedAssistant: string | null;
  actionPanel: (assistant: ITalkAssistant) => JSX.Element;
}) => {
  return (
    <List.Item
      id={assistant.assistantId}
      key={assistant.assistantId}
      title={assistant.title}
      subtitle={
        ConfigurationModelCollection.find((x: { key: string; title: string }) => x.key === assistant.model)?.title
      }
      icon={assistant.avatar ? { source: assistant.avatar } : { source: assistant.emoji }}
      detail={<ModelDetailView assistant={assistant} snippets={snippets} />}
      actions={selectedAssistant === assistant.assistantId ? actionPanel(assistant) : undefined}
    />
  );
};

const ModelDetailView = (props: {
  assistant: ITalkAssistant;
  snippets: ITalkSnippet[];
  markdown?: string | null | undefined;
}) => {
  const { assistant, snippets, markdown } = props;

  return (
    <List.Item.Detail
      markdown={markdown ?? `${assistant.promptSystem}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={assistant.title} />
          <List.Item.Detail.Metadata.Label title="Description" text={assistant.description} />
          <List.Item.Detail.Metadata.Label title="Avatar" text={assistant.avatar} icon={assistant.avatar} />
          <List.Item.Detail.Metadata.Label title="Emoji" text={assistant.emoji} icon={assistant.emoji} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Model"
            text={
              ConfigurationModelCollection.find((x: { key: string; title: string }) => x.key === assistant.model)?.title
            }
          />
          <List.Item.Detail.Metadata.Label title="Temperature Model" text={assistant.modelTemperature} />
          {/* <List.Item.Detail.Metadata.Label title="Webhook" text={(assistant.webhookUrl ? assistant.webhookUrl : "")} /> */}
          <List.Item.Detail.Metadata.Label
            title="Type communication"
            text={
              ConfigurationTypeCommunication.find(
                (x: { key: string; title: string }) => x.key === assistant.typeCommunication
              )?.title
            }
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Additional data" text={assistant.additionalData} />
          <List.Item.Detail.Metadata.Label title="Local" text={assistant.isLocal ? "YES" : "no"} />
          <List.Item.Detail.Metadata.Label title="ID" text={assistant.assistantId} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Available snippets" text={assistant.snippet?.length.toString()} />
          {assistant.snippet?.map((snippetId: string) => (
            <List.Item.Detail.Metadata.Label
              key={snippetId}
              title=""
              text={snippets.find((x: ITalkSnippet) => x.snippetId === snippetId)?.title}
              icon={snippets.find((x: ITalkSnippet) => x.snippetId === snippetId)?.emoji}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
