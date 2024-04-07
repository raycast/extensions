import { Color, Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences, Cache } from "@raycast/api";
import { isLowPowerModeEnabled } from "./utils/powerManagement";
import { useState, useEffect } from "react";
import main from "./toggle-low-power-mode";

export default function lowPowerMenuBar() {
  const cache = new Cache();

  const [currentState, setCurrentState] = useState<boolean>(() => {
    const cachedState = cache.get("currentState");
    return cachedState === undefined ? true : Boolean(cachedState);
  });

  const isEnabled = isLowPowerModeEnabled();
  const disabledIcon = { source: Icon.BatteryDisabled, tintColor: Color.PrimaryText };
  const enabledIcon = { source: Icon.BatteryCharging, tintColor: Color.Yellow };
  const preferences = getPreferenceValues<Preferences.LowpowerMenubar>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const newValue = Boolean(isEnabled);
        setCurrentState(newValue);
        cache.set("currentState", newValue.toString());
      } catch (error) {
        console.error("Error fetching low-power-mode state:", error);
      }
    };
    fetchData();
  }, [currentState]);

  if (preferences.hideIconWhenDisabled && !isEnabled) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={isEnabled ? enabledIcon : disabledIcon}
      tooltip={isEnabled ? "Low Power Mode: On" : "Low Power Mode: Off"}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={isEnabled ? "Disable" : "Enable"}
          onAction={async () => {
            await main(true);
            const newState = isLowPowerModeEnabled();
            setCurrentState(Boolean(newState));
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Gear} title="Settings" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
