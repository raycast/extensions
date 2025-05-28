import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DestructiveAction, PinAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { Model } from "./type";
import { ModelForm } from "./views/model/form";
import { ModelListItem, ModelListView } from "./views/model/list";

export default function Model() {
  const models = useModel();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const { push } = useNavigation();

  const getActionPanel = (model: Model) => (
    <ActionPanel>
      <Action
        title={"Edit Model"}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        icon={Icon.Pencil}
        onAction={() => push(<ModelForm model={model} use={{ models }} />)}
      />
      <Action
        title={"Create Model"}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.Plus}
        onAction={() => push(<ModelForm name={searchText} use={{ models }} />)}
      />
      {model.id !== "default" && (
        <>
          <PinAction
            title={model.pinned ? "Unpin Model" : "Pin Model"}
            isPinned={model.pinned}
            onAction={() => models.update({ ...model, pinned: !model.pinned })}
          />
          <ActionPanel.Section title="Delete">
            <DestructiveAction
              title="Remove"
              dialog={{
                title: "Are you sure you want to remove this model from your collection?",
              }}
              onAction={() => models.remove(model)}
            />
          </ActionPanel.Section>
        </>
      )}
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedModels = models.data.sort(
    (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
  );

  const filteredModels = sortedModels
    .filter((value, index, self) => index === self.findIndex((model) => model.id === value.id))
    .filter((model) => {
      if (searchText === "") {
        return true;
      }
      return (
        model.prompt.toLowerCase().includes(searchText.toLowerCase()) ||
        model.name.toLowerCase().includes(searchText.toLowerCase()) ||
        model.temperature.toLocaleString().toLowerCase().includes(searchText.toLowerCase())
      );
    });

  const defaultModelOnly = filteredModels.find((x) => x.id === DEFAULT_MODEL.id) ?? DEFAULT_MODEL;

  const customModelsOnly = filteredModels.filter((x) => x.id !== DEFAULT_MODEL.id);

  return (
    <List
      isShowingDetail={filteredModels.length === 0 ? false : true}
      isLoading={models.isLoading}
      filtering={false}
      throttle={false}
      navigationTitle={"Models"}
      selectedItemId={selectedModelId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedModelId) {
          setSelectedModelId(id);
        }
      }}
      searchBarPlaceholder="Search model..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {models.data.length === 0 ? (
        <List.EmptyView title="No custom models" description="Create a new model with ⌘ + N" icon={Icon.Stars} />
      ) : (
        <>
          <ModelListItem
            key="default"
            model={defaultModelOnly}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
          <ModelListView
            key="pinned"
            title="Pinned"
            models={customModelsOnly.filter((x) => x.pinned)}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
          <ModelListView
            key="models"
            title="Models"
            models={customModelsOnly.filter((x) => !x.pinned)}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
        </>
      )}
    </List>
  );
}
