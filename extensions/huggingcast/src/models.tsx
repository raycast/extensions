/**
 * "Models" Command
 *
 * Enables users to create and manage custom models to use when asking questions.
 * Users can select from a variety of Hugging Face "warm" models.
 *
 * Key Features:
 * - CRUD
 */

import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import ModelForm from "./views/models/model-form";
import { useModels } from "./hooks/useModels";
import { Model } from "./types/model";
import { formatFullTime } from "./utils/date/time";
import { useEffect, useState } from "react";

export default function Models() {
  const { push } = useNavigation();
  const { data: models, remove: removeModel, refresh: refreshModels, isLoading: isLoadingModels } = useModels();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const handleConfirmDelete = (model: Model) => {
    return confirmAlert({
      title: "Delete this model?",
      message: "You will not be able to recover it",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: () => removeModel(model),
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  useEffect(() => {
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models]);

  const renderListActions = () => (
    <ActionPanel>
      <Action
        title="New Model"
        icon={Icon.PlusCircle}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(<ModelForm />, async () => {
            await refreshModels();
          })
        }
      />
    </ActionPanel>
  );

  const renderItemActions = (model: Model) => (
    <ActionPanel>
      <Action
        title="New Model"
        icon={Icon.PlusCircle}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(<ModelForm />, async () => {
            await refreshModels();
          })
        }
      />
      <Action
        title="Update Model"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        onAction={() =>
          push(<ModelForm modelId={model.id} />, async () => {
            await refreshModels();
          })
        }
      />
      <Action
        title="Delete Model"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => handleConfirmDelete(model)}
      />
    </ActionPanel>
  );

  return (
    <List
      key={selectedModelId}
      isLoading={isLoadingModels}
      isShowingDetail={models.length !== 0}
      selectedItemId={selectedModelId ?? undefined}
      actions={renderListActions()}
      searchBarPlaceholder="Search models..."
    >
      {models.length === 0 ? (
        <List.EmptyView title="No models yet" description="Create models for personalized conversations 🌟" />
      ) : (
        models.map((model) => (
          <List.Item
            key={model.id}
            id={model.id}
            title={model.name}
            detail={
              <List.Item.Detail
                isLoading={isLoadingModels}
                markdown={model.prompt}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Name">
                      {model.model ? (
                        <List.Item.Detail.Metadata.TagList.Item text={model.name} color={Color.Blue} />
                      ) : (
                        <List.Item.Detail.Metadata.TagList.Item text={"Default"} color={Color.SecondaryText} />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Link
                      title="Model"
                      target={`https://huggingface.co/${model.model}`}
                      text={model.model}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Date Created" text={formatFullTime(model.createdAt)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={renderItemActions(model)}
          />
        ))
      )}
    </List>
  );
}
