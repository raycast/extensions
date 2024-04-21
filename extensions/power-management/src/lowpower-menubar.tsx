import { Color, Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences, showHUD } from "@raycast/api";
import { isLowPowerModeEnabled, toggleLowPowerMode } from "./utils/powerManagement";
import { useState, useEffect } from "react";
import { showFailureToast, useCachedState } from "@raycast/utils";

export default function lowPowerMenuBar({ launchContext }: { launchContext?: { isEnabled: boolean } }) {
  const isEnabled = launchContext ? launchContext.isEnabled : isLowPowerModeEnabled();
  const disabledIcon = { source: Icon.BatteryDisabled, tintColor: Color.PrimaryText };
  const enabledIcon = { source: Icon.BatteryCharging, tintColor: Color.Yellow };
  const { hideIconWhenDisabled } = getPreferenceValues<Preferences.LowpowerMenubar>();
  const [enabledState, setEnabled] = useCachedState<boolean>("low-power-mode-enabled");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(isEnabled);
    setIsLoading(false);
  }, [isEnabled]);

  if (hideIconWhenDisabled && !isEnabled) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={enabledState ? enabledIcon : disabledIcon}
      tooltip={enabledState ? "Low Power Mode: On" : "Low Power Mode: Off"}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={enabledState ? "Disable" : "Enable"}
          onAction={async () => {
            setIsLoading(true);
            let toggleResult;

            try {
              toggleResult = await toggleLowPowerMode();
            } catch (error) {
              setIsLoading(false);
              showFailureToast(error, { title: "Could not toggle low power mode" });
              return;
            }

            setEnabled(toggleResult);
            setIsLoading(false);
            showHUD(`✅ Low power mode is turned ${toggleResult ? "on" : "off"}`);
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Gear} title="Settings" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
