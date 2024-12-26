import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { MenuBarExtra } from "@raycast/api";
import { getIcon } from "../state/utils";
import {
  callInputBooleanToggleService,
  callInputBooleanTurnOffService,
  callInputBooleanTurnOnService,
  isEditableInputBoolean,
} from "./utils";

function InputBooleanToggleMenubarItem(props: { state: State }) {
  return (
    <MenuBarExtra.Item title="Toggle" icon="cached.svg" onAction={() => callInputBooleanToggleService(props.state)} />
  );
}

function InputBooleanTurnOnMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputBoolean(s) || s.state !== "off") {
    return null;
  }
  return <MenuBarExtra.Item title="Turn On" icon="power-on.svg" onAction={() => callInputBooleanTurnOnService(s)} />;
}

function InputBooleanTurnOffMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputBoolean(s) || s.state !== "on") {
    return null;
  }
  return <MenuBarExtra.Item title="Turn Off" icon="power-off.svg" onAction={() => callInputBooleanTurnOffService(s)} />;
}

export function InputBooleanMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <InputBooleanToggleMenubarItem state={s} />
      <InputBooleanTurnOffMenubarItem state={s} />
      <InputBooleanTurnOnMenubarItem state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
