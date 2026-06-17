import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { getIcon, getStateValue } from "@components/state/utils";
import { State } from "@lib/haapi";
import { capitalizeFirstLetter, getFriendlyName } from "@lib/utils";
import { Icon, Image, MenuBarExtra } from "@raycast/api";
import {
  callAutomationTriggerService,
  callAutomationTurnOffService,
  callAutomationTurnOnService,
  isAutomationEditable,
} from "./utils";

function AutomationMenubarItemBase(props: {
  state: State;
  title: string;
  icon?: Image.ImageLike;
  actionFunction: (state: State) => void;
  hide?: boolean;
}) {
  const s = props.state;
  if (!isAutomationEditable(s) || props.hide === true) {
    return null;
  }
  return <MenuBarExtra.Item title={props.title} icon={props.icon} onAction={() => props.actionFunction(s)} />;
}

function AutomationTurnOnMenubarItem(props: { state: State }) {
  return (
    <AutomationMenubarItemBase
      state={props.state}
      icon="power.svg"
      title="Turn On"
      actionFunction={callAutomationTurnOnService}
      hide={props.state.state === "on"}
    />
  );
}

function AutomationTurnOffMenubarItem(props: { state: State }) {
  return (
    <AutomationMenubarItemBase
      state={props.state}
      icon="power-on.svg"
      title="Turn Off"
      actionFunction={callAutomationTurnOffService}
      hide={props.state.state === "off"}
    />
  );
}

function AutomationTriggerMenubarItem(props: { state: State }) {
  return (
    <AutomationMenubarItemBase
      state={props.state}
      icon={Icon.Terminal}
      title="Trigger"
      actionFunction={callAutomationTriggerService}
      hide={props.state.state === "unavailable"}
    />
  );
}

export function AutomationMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} subtitle={capitalizeFirstLetter(getStateValue(s))} icon={getIcon(s)}>
      <AutomationTurnOnMenubarItem state={s} />
      <AutomationTurnOffMenubarItem state={s} />
      <AutomationTriggerMenubarItem state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
