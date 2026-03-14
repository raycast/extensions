import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import type { ModelOption } from "../lib/types";

type ModelPickerViewProps = {
  models: ModelOption[];
  recentModels: ModelOption[];
  selectedModel?: ModelOption;
  onSelect: (model: ModelOption) => Promise<void>;
};

export function ModelPickerView(props: ModelPickerViewProps) {
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return props.models;
    }
    return props.models.filter((item) =>
      [
        item.title,
        item.providerTitle,
        item.subtitle,
        `${item.providerID}/${item.modelID}`,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [props.models, searchText]);

  const recentKeys = new Set(
    props.recentModels.map((item) => `${item.providerID}/${item.modelID}`),
  );
  const recent = props.recentModels.filter((item) =>
    props.models.some(
      (model) =>
        model.providerID === item.providerID && model.modelID === item.modelID,
    ),
  );
  const rest = filtered.filter(
    (item) => !recentKeys.has(`${item.providerID}/${item.modelID}`),
  );

  return (
    <List
      searchBarPlaceholder="Search models"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {recent.length > 0 && !searchText.trim() ? (
        <List.Section title="Recent Models">
          {recent.map((model) => (
            <ModelItem
              key={`${model.providerID}/${model.modelID}`}
              model={model}
              selectedModel={props.selectedModel}
              onSelect={props.onSelect}
            />
          ))}
        </List.Section>
      ) : null}
      <List.Section title="All Models">
        {rest.map((model) => (
          <ModelItem
            key={`${model.providerID}/${model.modelID}`}
            model={model}
            selectedModel={props.selectedModel}
            onSelect={props.onSelect}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ModelItem(props: {
  model: ModelOption;
  selectedModel?: ModelOption;
  onSelect: (model: ModelOption) => Promise<void>;
}) {
  const selected =
    props.selectedModel?.providerID === props.model.providerID &&
    props.selectedModel?.modelID === props.model.modelID;
  return (
    <List.Item
      id={`${props.model.providerID}/${props.model.modelID}`}
      title={props.model.title}
      subtitle={
        props.model.subtitle ??
        `${props.model.providerID}/${props.model.modelID}`
      }
      icon={selected ? Icon.CheckCircle : Icon.Circle}
      accessories={[
        { text: props.model.providerTitle },
        ...(props.model.isDefault ? [{ tag: "default" }] : []),
        ...(props.model.isConnected ? [{ tag: "connected" }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Select Model"
            icon={Icon.CheckCircle}
            onAction={() => props.onSelect(props.model)}
          />
        </ActionPanel>
      }
    />
  );
}
