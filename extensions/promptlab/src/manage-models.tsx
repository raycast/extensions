import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useModels } from "./hooks/useModels";
import ModelForm from "./components/Models/ModelForm";
import { useAdvancedSettings } from "./hooks/useAdvancedSettings";
import ManageModelsActionPanel from "./components/Models/actions/ManageModelsActionsPanel";
import { Model } from "./lib/models/types";

export default function ManageModels() {
  const models = useModels();
  const { advancedSettings } = useAdvancedSettings();

  const listItems = models.models.map((model) => {
    return (
      <List.Item
        title={model.name}
        subtitle={model.description}
        key={model.id}
        icon={{ source: model.icon, tintColor: model.iconColor }}
        accessories={[
          {
            icon: model.isDefault ? Icon.Checkmark : undefined,
            tooltip: model.isDefault ? "Default Model" : undefined,
          },
          {
            icon: model.favorited ? { source: Icon.StarCircle, tintColor: Color.Yellow } : undefined,
            tooltip: model.favorited ? "Favorited" : undefined,
          },
        ]}
        actions={<ManageModelsActionPanel model={model} models={models} settings={advancedSettings} />}
      />
    );
  });

  const [favorites, otherModels] = models.models.reduce(
    (acc, model) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      model.favorited ? acc[0].push(model) : acc[1].push(model);
      return acc;
    },
    [[], []] as [Model[], Model[]],
  );

  return (
    <List
      isLoading={models.isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Model"
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<ModelForm models={models} />}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No models yet, add one to get started." icon={Icon.PlusCircle} />
      {favorites.length ? (
        <List.Section title="Favorites">
          {listItems.filter((item) => favorites.map((model) => model.name).includes(item.props.title))}
        </List.Section>
      ) : null}
      {otherModels.length ? (
        <List.Section title={favorites.length ? "Other Models" : "All Models"}>
          {listItems.filter((item) => otherModels.map((model) => model.name).includes(item.props.title))}
        </List.Section>
      ) : null}
    </List>
  );
}
