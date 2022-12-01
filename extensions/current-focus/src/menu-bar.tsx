import { environment, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { getIcon, getFocus, isPaused } from "./utils";

export default function MenuBar() {
  const focus = getFocus();
  const icon = getIcon(focus?.icon);

  if (isPaused()) {
    return null;
  }

  return (
    <MenuBarExtra icon={icon} title={focus.text}>
      <MenuItem />
    </MenuBarExtra>
  );
}

function MenuItem() {
  if (environment.launchType === LaunchType.UserInitiated) {
    launchCommand({ name: "set-focus", type: LaunchType.UserInitiated });
  }
  return null;
}
