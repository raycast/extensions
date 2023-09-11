import { Action, Alert, Icon, confirmAlert, showToast } from "@raycast/api";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { Model, ModelManager } from "../../../utils/types";
import { getActionShortcut, isActionEnabled } from "../../../utils/action-utils";

/**
 * Action to delete a model.
 * @param props.model The model to delete.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export const DeleteModelAction = (props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { model, models, settings } = props;

  if (!isActionEnabled("DeleteModelAction", settings)) {
    return null;
  }

  return (
    <Action
      title="Delete Model"
      icon={Icon.Trash}
      shortcut={getActionShortcut("DeleteModelAction", settings)}
      style={Action.Style.Destructive}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete Model?",
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          await models.deleteModel(model);
          await models.revalidate();
        }
        await showToast({ title: `Deleted Model`, message: model.name });
      }}
    />
  );
};

/**
 * Action to delete all models.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export const DeleteAllModelsAction = (props: { models: ModelManager; settings: typeof defaultAdvancedSettings }) => {
  const { models, settings } = props;

  if (!isActionEnabled("DeleteAllModelsAction", settings)) {
    return null;
  }

  return (
    <Action
      title="Delete All Models"
      icon={Icon.Trash}
      shortcut={getActionShortcut("DeleteAllModelsAction", settings)}
      style={Action.Style.Destructive}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Delete ${models.models.length} Models?`,
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          const totalAmount = models.models.length;
          for (const model of models.models) {
            await models.deleteModel(model);
            await models.revalidate();
          }
          await showToast({ title: `Deleted ${totalAmount} Models` });
        }
      }}
    />
  );
};
