import { List } from "@raycast/api";
import { Prompt } from "../../type";

export const PromptListView = ({
  title,
  prompts,
  selectedPrompt,
  actionPanel,
}: {
  title: string;
  prompts: Prompt[];
  selectedPrompt: string | null;
  actionPanel: (prompt: Prompt) => JSX.Element;
}) => (
  <List.Section title={title} subtitle={prompts.length.toLocaleString()}>
    {prompts.map((prompt) => (
      <PromptListItem key={prompt.id} prompt={prompt} selectedPrompt={selectedPrompt} actionPanel={actionPanel} />
    ))}
  </List.Section>
);

export const PromptListItem = ({
  prompt,
  selectedPrompt,
  actionPanel,
}: {
  prompt: Prompt;
  selectedPrompt: string | null;
  actionPanel: (prompt: Prompt) => JSX.Element;
}) => {
  return (
    <List.Item
      id={prompt.id}
      key={prompt.id}
      title={prompt.name}
      accessories={[{ text: new Date(prompt.updated_at ?? 0).toLocaleDateString() }]}
      detail={<PromptDetailView prompt={prompt} />}
      actions={selectedPrompt === prompt.id ? actionPanel(prompt) : undefined}
    />
  );
};

const PromptDetailView = (props: { prompt: Prompt; markdown?: string | null | undefined }) => {
  const { prompt, markdown } = props;

  return (
    <List.Item.Detail
      markdown={markdown ?? `${prompt.prompt}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Prompt">
            <List.Item.Detail.Metadata.TagList.Item text={prompt.option} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Temperature" text={prompt.temperature.toLocaleString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ID" text={prompt.id} />
          <List.Item.Detail.Metadata.Label
            title="Updated at"
            text={new Date(prompt.updated_at ?? 0).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Created at"
            text={new Date(prompt.created_at ?? 0).toLocaleString()}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
