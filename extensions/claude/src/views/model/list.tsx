import { List } from "@raycast/api";
import type { ReactNode } from "react";
import type { Model } from "../../type";
import { shortModelName, supportsTemperature } from "../../utils/models";

export const ModelListView = ({
  title,
  models,
  selectedModel,
  actionPanel,
}: {
  title: string;
  models: Model[];
  selectedModel: string | null;
  actionPanel: (model: Model) => ReactNode;
}) =>
  // Gate the section on non-empty, matching `src/conversation.tsx:140`'s pattern for the
  // Pinned header — an empty `List.Section` still renders its header/subtitle, which
  // showed a "Pinned — 0" (or "Presets — 0") header with nothing under it.
  models.length === 0 ? null : (
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
  actionPanel: (model: Model) => ReactNode;
}) => {
  return (
    <List.Item
      id={model.id}
      key={model.id}
      title={shortModelName(model.name)}
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
          {/* Sampling parameters were removed on Claude Opus 4.7 and later — showing a
              stale temperature value for those models would misrepresent what the
              request actually sends. Mirrors the same gate in the form (form.tsx). */}
          {supportsTemperature(model.option) && (
            <List.Item.Detail.Metadata.Label title="Temperature" text={model.temperature.toLocaleString()} />
          )}
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
