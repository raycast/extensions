import { Color, getPreferenceValues, LaunchProps, MenuBarExtra, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { isDoorstopperEnabled, startDoorstopper, stopDoorstopper } from "./util";

export default function Command(props: LaunchProps) {
  const hasLaunchContext = props.launchContext?.enabled !== undefined;
  const isEnabled = hasLaunchContext ? props?.launchContext?.enabled : isDoorstopperEnabled();
  const preferences = getPreferenceValues<Preferences.Statusmenu>();
  const [status, setDoorstopperStatus] = useState(isEnabled);

  useEffect(() => {
    setDoorstopperStatus(isEnabled);
  }, [isEnabled]);

  const handleStatus = async () => {
    if (status) {
      setDoorstopperStatus(false);
      stopDoorstopper({ status: true });
      if (preferences.hiddenWhenDisabled) {
        showHUD("Doorstopper is now disabled");
      }
    } else {
      setDoorstopperStatus(true);
      startDoorstopper({ status: true });
    }
  };

  if (preferences.hiddenWhenDisabled && !status) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={false}
      icon={
        status
          ? { source: `door-open.svg`, tintColor: Color.PrimaryText }
          : { source: `door-closed.svg`, tintColor: Color.PrimaryText }
      }
    >
      <>
        <MenuBarExtra.Section title={`Doorstopper is ${status ? "enabled" : "disabled"}`} />
        <MenuBarExtra.Item title={status ? "Disable" : "Enable"} onAction={handleStatus} />
      </>
    </MenuBarExtra>
  );
}
