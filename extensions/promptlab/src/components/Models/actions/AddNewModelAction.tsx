import { Action, Icon } from "@raycast/api";
import ModelForm from "../ModelForm";
import { ModelManager } from "../../../lib/models/types";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";

/**
 * Action to add a new model.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export default function AddNewModelAction(props: { models: ModelManager; settings: typeof defaultAdvancedSettings }) {
  const { models, settings } = props;

  if (!isActionEnabled("AddNewModelAction", settings)) {
    return null;
  }

  return (
    <Action.Push
      title="Add New Model"
      icon={Icon.PlusCircle}
      shortcut={getActionShortcut("AddNewModelAction", settings)}
      target={<ModelForm models={models} />}
    />
  );
}
