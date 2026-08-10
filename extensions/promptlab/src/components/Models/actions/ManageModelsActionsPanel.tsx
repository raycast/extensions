import { ActionPanel } from "@raycast/api";
import AddNewModelAction from "./AddNewModelAction";
import EditModelAction from "./EditModelAction";
import ToggleModelDefaultAction from "./ToggleModelDefaultAction";
import CreateModelDerivativeAction from "./CreateModelDerivativeAction";
import { AdvancedActionSubmenu } from "../../actions/AdvancedActionSubmenu";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { anyActionsEnabled } from "../../../lib/actions";
import { Model, ModelManager } from "../../../lib/models/types";
import CopyJSONAction from "../../actions/CopyJSONAction";
import CopyIDAction from "../../actions/CopyIDAction";
import ToggleFavoriteAction from "../../actions/ToggleFavoriteAction";
import DeleteAction from "../../actions/DeleteAction";
import DeleteAllAction from "../../actions/DeleteAllAction";
import CopyAllJSONAction from "../../actions/CopyAllJSONAction";

export default function ManageModelsActionPanel(props: {
  model: Model;
  models: ModelManager;
  settings: typeof defaultAdvancedSettings;
}) {
  const { model, models, settings } = props;
  const cleansedModel = { ...model, id: "", apiKey: "" };
  return (
    <ActionPanel>
      <AddNewModelAction models={models} settings={settings} />
      {anyActionsEnabled(
        [
          "EditModelAction",
          "ToggleFavoriteAction",
          "ToggleModelDefaultAction",
          "CopyIDAction",
          "CopyJSONAction",
          "CopyAllModelsJSONAction",
          "CreateModelDerivativeAction",
          "DeleteAction",
          "DeleteAllAction",
        ],
        settings,
      ) ? (
        <ActionPanel.Section title="Model Actions">
          <EditModelAction model={model} models={models} settings={settings} />
          {/* <ToggleModelFavoriteAction model={model} models={models} settings={settings} /> */}
          <ToggleFavoriteAction object={model} settings={settings} revalidateObjects={models.revalidate} />
          <ToggleModelDefaultAction model={model} models={models} settings={settings} />

          <CopyIDAction object={model} settings={settings} />
          <CopyJSONAction object={cleansedModel} settings={settings} />
          <CopyAllJSONAction objects={models.models} settings={settings} />

          <CreateModelDerivativeAction model={model} models={models} settings={settings} />

          <DeleteAction object={model} settings={settings} revalidateObjects={models.revalidate} />
          <DeleteAllAction objects={models.models} settings={settings} revalidateObjects={models.revalidate} />
        </ActionPanel.Section>
      ) : null}
      <AdvancedActionSubmenu settings={settings} />
    </ActionPanel>
  );
}
