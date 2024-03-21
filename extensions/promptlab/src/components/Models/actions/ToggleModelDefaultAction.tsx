import { Action, Icon } from "@raycast/api";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { Model, ModelManager } from "../../../lib/models/types";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { updateModel } from "../../../lib/models";

/**
 * Action to toggle a model's default status.
 * @param props.model The model to toggle.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export default function ToggleModelDefaultAction(props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) {
  const { model, models, settings } = props;

  if (!isActionEnabled("ToggleModelDefaultAction", settings)) {
    return null;
  }

  return (
    <Action
      title={`${model.isDefault ? "Remove As Default" : "Set As Default"}`}
      icon={model.isDefault ? Icon.XMarkCircle : Icon.CheckCircle}
      shortcut={getActionShortcut("ToggleModelDefaultAction", settings)}
      onAction={async () => {
        await updateModel(model, { ...model, isDefault: !model.isDefault });
        for (const otherModel of models.models) {
          if (otherModel.id != model.id) {
            await updateModel(otherModel, { ...otherModel, isDefault: false });
          }
        }
        await models.revalidate();
      }}
    />
  );
}
