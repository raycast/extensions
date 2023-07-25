import { ActionPanel } from "@raycast/api";
import AddNewModelAction from "./AddNewModelAction";
import EditModelAction from "./EditModelAction";
import ToggleModelFavoriteAction from "./ToggleModelFavoriteAction";
import ToggleModelDefaultAction from "./ToggleModelDefaultAction";
import { CopyAllModelsJSONAction, CopyModelJSONAction } from "./CopyModelActions";
import CreateModelDerivativeAction from "./CreateModelDerivativeAction";
import { DeleteAllModelsAction, DeleteModelAction } from "./DeleteModelActions";
import { AdvancedActionSubmenu } from "../../actions/AdvancedActionSubmenu";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { anyActionsEnabled } from "../../../utils/action-utils";
import { Model, ModelManager } from "../../../utils/types";

export default function ManageModelsActionPanel(props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) {
  const { model, models, settings } = props;

  return (
    <ActionPanel>
      <AddNewModelAction models={models} settings={settings} />
      {anyActionsEnabled(
        [
          "EditModelAction",
          "ToggleModelFavoriteAction",
          "ToggleModelDefaultAction",
          "CopyModelJSONAction",
          "CopyAllModelsJSONAction",
          "CreateModelDerivativeAction",
          "DeleteModelAction",
          "DeleteAllModelsAction",
        ],
        settings
      ) ? (
        <ActionPanel.Section title="Model Actions">
          <EditModelAction model={model} models={models} settings={settings} />
          <ToggleModelFavoriteAction model={model} models={models} settings={settings} />
          <ToggleModelDefaultAction model={model} models={models} settings={settings} />

          <CopyModelJSONAction model={model} settings={settings} />
          <CopyAllModelsJSONAction models={models} settings={settings} />

          <CreateModelDerivativeAction model={model} models={models} settings={settings} />

          <DeleteModelAction model={model} models={models} settings={settings} />
          <DeleteAllModelsAction models={models} settings={settings} />
        </ActionPanel.Section>
      ) : null}
      <AdvancedActionSubmenu settings={settings} />
    </ActionPanel>
  );
}
