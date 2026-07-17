import { Icon, List } from "@raycast/api";
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
  const icons = [Icon.StackedBars1, Icon.StackedBars2, Icon.StackedBars3, Icon.StackedBars4];
  const t = Number.parseFloat((model.temperature ?? "0").toString());

  return (
    <List.Item.Detail
      markdown={markdown ?? `${model.prompt}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Model">
            <List.Item.Detail.Metadata.TagList.Item text={model.option} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Temperature"
            text={model.temperature.toLocaleString()}
            icon={icons[Math.min(Math.floor(t / 0.5), 3)]}
          />
          <List.Item.Detail.Metadata.Label title="Vision capabilities" text={model.vision ? "Enable" : "Disable"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ID" text={model.id} />
          <List.Item.Detail.Metadata.Label title="Updated at" text={new Date(model.updated_at ?? 0).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Created at" text={new Date(model.created_at ?? 0).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
