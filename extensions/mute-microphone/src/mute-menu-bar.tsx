import { Cache, Color, Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { get, toggleSystemAudioInputLevel } from "./utils";

export default function muteMenuBar() {
  const cache = new Cache();
  const cachedValue = cache.get("currentAudioInputLevel");
  const cachedValueNumber = cachedValue == undefined ? 1 : Number(cachedValue);
  const disabledIcon = { source: Icon.MicrophoneDisabled, tintColor: Color.Red };
  const enabledIcon = { source: Icon.Microphone };
  const preferences = getPreferenceValues<Preferences.MuteMenuBar>();

  const [currentAudioInputLevel, setCurrentAudioInputLevel] = useState<number>(cachedValueNumber);
  const icon = currentAudioInputLevel == 0 ? disabledIcon : enabledIcon;
  const menuItemText = currentAudioInputLevel == 0 ? "Unmute" : "Mute";

  useEffect(() => {
    const newValue = Number(get());
    if (!isNaN(newValue)) {
      setCurrentAudioInputLevel(newValue);
      cache.set("currentAudioInputLevel", newValue.toString());
    }
  }, []);

  function CommonMenuItems() {
    return (
      <MenuBarExtra icon={icon} tooltip="Audio input volume">
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={menuItemText}
            onAction={async () => {
              const newLevel = await toggleSystemAudioInputLevel(currentAudioInputLevel);
              setCurrentAudioInputLevel(Number(newLevel));
            }}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Settings..." onAction={openCommandPreferences} />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return preferences.hideIconWhenUnmuted ? (
    currentAudioInputLevel == 0 ? (
      <CommonMenuItems />
    ) : null
  ) : (
    <CommonMenuItems />
  );
}
