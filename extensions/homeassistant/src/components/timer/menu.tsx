import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getFriendlyName } from "../../utils";
import { MenuBarSubmenu } from "../menu";
import { getIcon } from "../states/list";
import { CopyEntityIDToClipboard } from "../states/menu";
import { callTimerCancelService, callTimerPauseService, callTimerStartService, isTimerEditable } from "./utils";

function TimerStartMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isTimerEditable(s)) {
    return null;
  }
  const title = s.state === "active" ? "Restart" : "Start";
  const iconSource = s.state === "active" ? Icon.ArrowClockwise : "play.png";
  return <MenuBarExtra.Item title={title} icon={iconSource} onAction={() => callTimerStartService(s)} />;
}

function TimerPauseMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isTimerEditable(s) || s.state !== "active") {
    return null;
  }
  return <MenuBarExtra.Item title="Pause" icon="pause.png" onAction={() => callTimerPauseService(s)} />;
}

function TimerCancelMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isTimerEditable(s) || s.state !== "active") {
    return null;
  }
  return <MenuBarExtra.Item title="Cancel" icon={Icon.XMarkCircle} onAction={() => callTimerCancelService(s)} />;
}

export function TimerMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <TimerStartMenubarItem state={s} />
      <TimerPauseMenubarItem state={s} />
      <TimerCancelMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
