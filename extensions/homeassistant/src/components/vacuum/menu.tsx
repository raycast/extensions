import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { State } from "@lib/haapi";
import { capitalizeFirstLetter, getFriendlyName } from "@lib/utils";
import { Icon, Image, MenuBarExtra } from "@raycast/api";
import { getIcon, getStateValue } from "../state/utils";
import {
  callVacuumLocateService,
  callVacuumPauseService,
  callVacuumReturnToBaseService,
  callVacuumStartService,
  callVacuumStopService,
  callVacuumTurnOffService,
  callVacuumTurnOnService,
  isVacuumEditable,
} from "./utils";

function VacuumMenubarItemBase(props: {
  state: State;
  title: string;
  icon?: Image.ImageLike;
  actionFunction: (state: State) => void;
  hide?: boolean;
}) {
  const s = props.state;
  if (!isVacuumEditable(s) || props.hide === true) {
    return null;
  }
  return <MenuBarExtra.Item title={props.title} icon={props.icon} onAction={() => props.actionFunction(s)} />;
}

function VacuumLocateMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Locate"
      icon={Icon.Binoculars}
      actionFunction={callVacuumLocateService}
      state={props.state}
    />
  );
}

function VacuumStartMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Start"
      icon="play.svg"
      actionFunction={callVacuumStartService}
      state={props.state}
      hide={props.state.state !== "docked"}
    />
  );
}

function VacuumPauseMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Pause"
      icon="pause.svg"
      actionFunction={callVacuumPauseService}
      state={props.state}
      hide={props.state.state === "docked"}
    />
  );
}

function VacuumStopMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Stop"
      icon={Icon.XMarkCircle}
      actionFunction={callVacuumStopService}
      state={props.state}
      hide={props.state.state === "docked"}
    />
  );
}

function VacuumTurnOnMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Turn On"
      icon="power-on.svg"
      actionFunction={callVacuumTurnOnService}
      state={props.state}
      hide={props.state.state !== "off"}
    />
  );
}

function VacuumTurnOffMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Turn Off"
      icon="power-off.svg"
      actionFunction={callVacuumTurnOffService}
      state={props.state}
      hide={props.state.state === "off"}
    />
  );
}

function VacuumReturnToBaseMenubarItem(props: { state: State }) {
  return (
    <VacuumMenubarItemBase
      title="Return to Base"
      icon={Icon.Terminal}
      actionFunction={callVacuumReturnToBaseService}
      state={props.state}
      hide={["docked", "unavailable"].includes(props.state.state)}
    />
  );
}

export function VacuumMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} subtitle={capitalizeFirstLetter(getStateValue(s))} icon={getIcon(s)}>
      <VacuumStartMenubarItem state={s} />
      <VacuumLocateMenubarItem state={s} />
      <VacuumPauseMenubarItem state={s} />
      <VacuumStopMenubarItem state={s} />
      <VacuumTurnOnMenubarItem state={s} />
      <VacuumTurnOffMenubarItem state={s} />
      <VacuumReturnToBaseMenubarItem state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
