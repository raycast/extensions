import { Action, Icon } from "@raycast/api";
import ModelForm from "../ModelForm";
import { Model, ModelManager } from "../../../lib/models/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";

/**
 * Action to edit a model.
 * @param props.model The model to edit.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export default function EditModelAction(props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) {
  const { model, models, settings } = props;

  if (!isActionEnabled("EditModelAction", settings)) {
    return null;
  }

  return (
    <Action.Push
      title="Edit Model"
      icon={Icon.Pencil}
      shortcut={getActionShortcut("EditModelAction", settings)}
      target={<ModelForm models={models} currentModel={model} />}
    />
  );
}
