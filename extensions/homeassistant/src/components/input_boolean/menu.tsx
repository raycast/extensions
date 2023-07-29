import { State } from "../../haapi";
import { MenuBarSubmenu } from "../menu";
import { getFriendlyName } from "../../utils";
import { CopyEntityIDToClipboard } from "../states/menu";
import { MenuBarExtra } from "@raycast/api";
import {
  callInputBooleanToggleService,
  callInputBooleanTurnOffService,
  callInputBooleanTurnOnService,
  isEditableInputBoolean,
} from "./utils";
import { getIcon } from "../states/utils";

function InputBooleanToggleMenubarItem(props: { state: State }) {
  return (
    <MenuBarExtra.Item title="Toggle" icon="toggle.png" onAction={() => callInputBooleanToggleService(props.state)} />
  );
}

function InputBooleanTurnOnMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputBoolean(s) || s.state !== "off") {
    return null;
  }
  return <MenuBarExtra.Item title="Turn On" icon="power-btn.png" onAction={() => callInputBooleanTurnOnService(s)} />;
}

function InputBooleanTurnOffMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputBoolean(s) || s.state !== "on") {
    return null;
  }
  return <MenuBarExtra.Item title="Turn Off" icon="power-btn.png" onAction={() => callInputBooleanTurnOffService(s)} />;
}

export function InputBooleanMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <InputBooleanToggleMenubarItem state={s} />
      <InputBooleanTurnOffMenubarItem state={s} />
      <InputBooleanTurnOnMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
