import { Action, Icon } from "@raycast/api";
import { Model, ModelManager } from "../../../utils/types";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../../utils/action-utils";

/**
 * Action to toggle a model's favorite status.
 * @param props.model The model to toggle.
 * @param props.models The model manager object.
 * @returns An action component.
 */
export default function ToggleModelFavoriteAction(props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) {
  const { model, models, settings } = props;

  if (!isActionEnabled("ToggleModelFavoriteAction", settings)) {
    return null;
  }

  return (
    <Action
      title={`${model.favorited ? "Remove From Favorites" : "Add To Favorites"}`}
      icon={model.favorited ? Icon.StarDisabled : Icon.Star}
      shortcut={getActionShortcut("ToggleModelFavoriteAction", settings)}
      onAction={async () => {
        await models.updateModel(model, { ...model, favorited: !model.favorited });
        await models.revalidate();
      }}
    />
  );
}
