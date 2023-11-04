import { Action } from "@raycast/api";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { Model, ModelManager } from "../../../utils/types";
import { getActionShortcut, isActionEnabled } from "../../../utils/action-utils";

/**
 * Action to copy a model's JSON representation to the clipboard.
 * @param props.model The model to copy.
 * @returns An action component.
 */
export const CopyModelJSONAction = (props: { model: Model; settings: typeof defaultAdvancedSettings }) => {
  const { model, settings } = props;

  if (!isActionEnabled("CopyModelJSONAction", settings)) {
    return null;
  }

  return (
    <Action.CopyToClipboard
      title="Copy Model JSON"
      content={(() => {
        const key = `--model-${model.name}`;
        const value: { [key: string]: Model } = {};
        value[key] = { ...model, id: "", apiKey: "" };
        return JSON.stringify(value);
      })()}
      shortcut={getActionShortcut("CopyModelJSONAction", settings)}
    />
  );
};

/**
 * Action to copy all models' JSON representation to the clipboard.
 * @param props.models The model manager object.
 * @param props.settings The advanced settings object.
 * @returns An action component.
 */
export const CopyAllModelsJSONAction = (props: { models: ModelManager; settings: typeof defaultAdvancedSettings }) => {
  const { models, settings } = props;

  if (!isActionEnabled("CopyAllModelsJSONAction", settings)) {
    return null;
  }

  return (
    <Action.CopyToClipboard
      title="Copy JSON For All Models"
      content={(() => {
        const value: { [key: string]: Model } = {};
        for (const model of models.models) {
          const key = `--model-${model.name}`;
          value[key] = { ...model, id: "", apiKey: "" };
        }
        return JSON.stringify(value);
      })()}
      shortcut={getActionShortcut("CopyAllModelsJSONAction", settings)}
    />
  );
};
