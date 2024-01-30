import { Action, Icon, useNavigation } from "@raycast/api";
import ModelForm from "../ModelForm";
import { Model, ModelManager } from "../../../lib/models/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";

/**
 * Action to create a new model based on an existing model.
 * @param props.model The model to create a derivative of.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export default function CreateModelDerivativeAction(props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) {
  const { model, models, settings } = props;
  const { push } = useNavigation();

  if (!isActionEnabled("CreateModelDerivativeAction", settings)) {
    return null;
  }

  return (
    <Action
      title="Create Derivative"
      icon={Icon.EyeDropper}
      shortcut={getActionShortcut("CreateModelDerivativeAction", settings)}
      onAction={async () => {
        const newModel = await models.createModel({
          ...model,
          name: `${model.name} Copy`,
          isDefault: false,
          favorited: false,
        });
        await models.revalidate();
        if (newModel) {
          push(<ModelForm models={models} currentModel={newModel} duplicate={true} />);
        }
      }}
    />
  );
}
