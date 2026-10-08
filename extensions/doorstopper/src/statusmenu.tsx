import { Color, getPreferenceValues, MenuBarExtra, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { isDoorstopperEnabled, startDoorstopper, stopDoorstopper } from "./util";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const isEnabled = isDoorstopperEnabled();
  const preferences = getPreferenceValues<Preferences.Statusmenu>();
  const [status, setDoorstopperStatus] = useState(isEnabled);

  useEffect(() => {
    setDoorstopperStatus(isEnabled);
  }, [isEnabled]);

  const handleStatus = async () => {
    try {
      if (status) {
        setDoorstopperStatus(false);
        await stopDoorstopper({ status: true });
        if (preferences.hiddenWhenDisabled) {
          showHUD("Doorstopper is now disabled");
        }
      } else {
        setDoorstopperStatus(true);
        await startDoorstopper({ status: true });
      }
    } catch (error) {
      showFailureToast("Failed to disable Doorstopper", { message: String(error) });
    }
  };

  if (preferences.icon === "" || (preferences.hiddenWhenDisabled && !status)) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={false}
      icon={
        status
          ? { source: `${preferences.icon}-open.svg`, tintColor: Color.PrimaryText }
          : { source: `${preferences.icon}-closed.svg`, tintColor: Color.PrimaryText }
      }
    >
      <>
        <MenuBarExtra.Section title={`Doorstopper is ${status ? "enabled" : "disabled"}`} />
        <MenuBarExtra.Item title={status ? "Disable" : "Enable"} onAction={handleStatus} />
      </>
    </MenuBarExtra>
  );
}
