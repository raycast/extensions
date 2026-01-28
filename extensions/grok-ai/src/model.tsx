import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DestructiveAction, PinAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { Model as ModelType } from "./type";
import { ModelForm } from "./views/model/form";
import { ModelListItem, ModelListView } from "./views/model/list";
import { ExportData, ImportData } from "./utils/import-export";
import { ImportForm } from "./views/import-form";
import { COMMAND_MODEL_PREFIX } from "./hooks/useCommand";

export default function Model() {
  const models = useModel();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const { push } = useNavigation();

  const getActionPanel = (model: ModelType) => (
    <ActionPanel>
      {!model.id.startsWith(COMMAND_MODEL_PREFIX) && (
        <Action
          title={"Edit Model"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          icon={Icon.Text}
          onAction={() => push(<ModelForm model={model} use={{ models }} />)}
        />
      )}
      <Action
        title={"Create Model"}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.Text}
        onAction={() => push(<ModelForm name={searchText} use={{ models }} />)}
      />
      <ActionPanel.Section title="Actions">
        <Action title={"Export Models"} icon={Icon.Upload} onAction={() => ExportData(models.data, "Models")} />
        <Action
          title={"Import Models"}
          icon={Icon.Download}
          onAction={() =>
            push(
              <ImportForm
                moduleName="Models"
                onSubmit={async (file) => {
                  ImportData<ModelType>("models", file).then((data) => {
                    models.setModels(data.reduce((acc, model) => ({ ...acc, [model.id]: model }), {}));
                  });
                }}
              />,
            )
          }
        />
      </ActionPanel.Section>
      {model.id !== "default" && !model.id.startsWith(COMMAND_MODEL_PREFIX) && (
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

  const sortedModels = Object.values(models.data).sort(
    (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
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

  const commandModelsOnly = filteredModels.filter(
    (x) => x.id !== DEFAULT_MODEL.id && x.id.startsWith(COMMAND_MODEL_PREFIX),
  );

  const customModelsOnly = filteredModels.filter(
    (x) => x.id !== DEFAULT_MODEL.id && !x.id.startsWith(COMMAND_MODEL_PREFIX),
  );

  return (
    <List
      isShowingDetail // always show detail view, since the default model is always selected
      isLoading={models.isLoading || models.isFetching}
      filtering={false}
      throttle={false}
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
      {models.isFetching ? (
        <List.EmptyView />
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
          <ModelListView
            key="ai-commands"
            title="AI Commands (read-only)"
            models={commandModelsOnly}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
        </>
      )}
    </List>
  );
}
