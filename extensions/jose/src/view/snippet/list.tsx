import { List } from "@raycast/api";
import { ConfigurationModelCollection, ConfigurationTypeCommunication } from "../../type/config";
import { TalkSnippetType } from "../../type/talk";

export const SnippetListView = ({
  snippets,
  selectedSnippet,
  actionPanel,
}: {
  snippets: TalkSnippetType[];
  selectedSnippet: string | null;
  actionPanel: (snippet: TalkSnippetType) => JSX.Element;
}) => {
  return (
    <>
      {Object.entries(SnippetGroupByCategory(snippets) as Record<string, TalkSnippetType[]>).map(([name, list]) => (
        <List.Section key={name} title={name} subtitle={list.length.toLocaleString()}>
          {list.map((snippet: TalkSnippetType) => (
            <SnippetListItem
              key={snippet.snippetId}
              snippet={snippet}
              selectedsnippet={selectedSnippet}
              actionPanel={actionPanel}
            />
          ))}
        </List.Section>
      ))}
    </>
  );
};

export function SnippetGroupByCategory(array: TalkSnippetType[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return array.reduce((acc: any, obj: TalkSnippetType) => {
    const key = obj.category;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
}

export const SnippetListItem = ({
  snippet,
  selectedsnippet,
  actionPanel,
}: {
  snippet: TalkSnippetType;
  selectedsnippet: string | null;
  actionPanel: (snippet: TalkSnippetType) => JSX.Element;
}) => {
  return (
    <List.Item
      id={snippet.snippetId}
      key={snippet.snippetId}
      title={snippet.title}
      subtitle={
        ConfigurationModelCollection.find((x: { key: string; title: string }) => x.key === snippet.model)?.title
      }
      icon={snippet.emoji}
      detail={<ModelDetailView snippet={snippet} />}
      actions={selectedsnippet === snippet.snippetId ? actionPanel(snippet) : undefined}
    />
  );
};

const ModelDetailView = (props: { snippet: TalkSnippetType; markdown?: string | null | undefined }) => {
  const { snippet, markdown } = props;

  return (
    <List.Item.Detail
      markdown={markdown ?? `${snippet.promptSystem}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={snippet.title} />
          <List.Item.Detail.Metadata.Label title="Category" text={snippet.category} />
          <List.Item.Detail.Metadata.Label title="Emoji" text={snippet.emoji} icon={snippet.emoji} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Model"
            text={
              ConfigurationModelCollection.find((x: { key: string; title: string }) => x.key === snippet.model)?.title
            }
          />
          <List.Item.Detail.Metadata.Label title="Temperature Model" text={snippet.modelTemperature} />
          <List.Item.Detail.Metadata.Label title="Webhook" text={snippet.webhookUrl ? snippet.webhookUrl : ""} />
          <List.Item.Detail.Metadata.Label
            title="Type communication"
            text={
              ConfigurationTypeCommunication.find(
                (x: { key: string; title: string }) => x.key === snippet.typeCommunication
              )?.title
            }
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Local" text={snippet.isLocal ? "YES" : "no"} />
          <List.Item.Detail.Metadata.Label title="ID" text={snippet.snippetId} />
          <List.Item.Detail.Metadata.Separator />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
