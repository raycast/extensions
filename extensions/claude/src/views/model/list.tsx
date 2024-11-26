import { List } from "@raycast/api";
import { Model } from "../../type";

export const ModelListView = ({
  title,
  models,
  selectedModel,
  actionPanel,
}: {
  title: string;
  models: Model[];
  selectedModel: string | null;
  actionPanel: (model: Model) => JSX.Element;
}) => (
  <List.Section title={title} subtitle={models.length.toLocaleString()}>
    {models.map((model) => (
      <ModelListItem key={model.id} model={model} selectedModel={selectedModel} actionPanel={actionPanel} />
    ))}
  </List.Section>
);

export const ModelListItem = ({
  model,
  selectedModel,
  actionPanel,
}: {
  model: Model;
  selectedModel: string | null;
  actionPanel: (model: Model) => JSX.Element;
}) => {
  return (
    <List.Item
      id={model.id}
      key={model.id}
      title={model.name}
      accessories={[{ text: new Date(model.updated_at ?? 0).toLocaleDateString() }]}
      detail={<ModelDetailView model={model} />}
      actions={selectedModel === model.id ? actionPanel(model) : undefined}
    />
  );
};

const ModelDetailView = (props: { model: Model; markdown?: string | null | undefined }) => {
  const { model, markdown } = props;

  return (
    <List.Item.Detail
      markdown={markdown ?? `${model.prompt}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Model">
            <List.Item.Detail.Metadata.TagList.Item text={model.option} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Temperature" text={model.temperature.toLocaleString()} />
          {model.max_tokens && (
            <List.Item.Detail.Metadata.Label title="Max tokens" text={model.max_tokens.toLocaleString()} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ID" text={model.id} />
          <List.Item.Detail.Metadata.Label title="Updated at" text={new Date(model.updated_at ?? 0).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Created at" text={new Date(model.created_at ?? 0).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
