import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { getIcon } from "@components/state/utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { Icon, MenuBarExtra } from "@raycast/api";
import { callTimerCancelService, callTimerPauseService, callTimerStartService, isTimerEditable } from "./utils";

function TimerStartMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isTimerEditable(s)) {
    return null;
  }
  const title = s.state === "active" ? "Restart" : "Start";
  const iconSource = s.state === "active" ? Icon.ArrowClockwise : "play.svg";
  return <MenuBarExtra.Item title={title} icon={iconSource} onAction={() => callTimerStartService(s)} />;
}

function TimerPauseMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isTimerEditable(s) || s.state !== "active") {
    return null;
  }
  return <MenuBarExtra.Item title="Pause" icon="pause.svg" onAction={() => callTimerPauseService(s)} />;
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
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
