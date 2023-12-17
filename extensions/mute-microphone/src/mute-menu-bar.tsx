import { Cache, Color, Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCurrentAudioInputLevel, toggleSystemAudioInputLevel } from "./shared/utils";

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
    const newValue = getCurrentAudioInputLevel();
    if (!isNaN(newValue)) {
      setCurrentAudioInputLevel(newValue);
      cache.set("currentAudioInputLevel", newValue.toString());
    }
  }, []);

<<<<<<< HEAD
  const CommonMenuItems = () => (
    <MenuBarExtra icon={icon} tooltip="Audio input volume">
      <MenuBarExtra.Item
        title={menuItemText}
        onAction={async () => {
          const newLevel = await toggleSystemAudioInputLevel(currentAudioInputLevel);
          setCurrentAudioInputLevel(Number(newLevel));
        }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Settings..." onAction={openCommandPreferences} />
    </MenuBarExtra>
||||||| parent of ef1618f9 (added show menubar icon only if muted, issue #8832)
  return (
    <MenuBarExtra icon={icon} tooltip="Audio input volume">
      <MenuBarExtra.Item
        title={menuItemText}
        onAction={async () => {
          const newLevel = await toggleSystemAudioInputLevel(currentAudioInputLevel);
          setCurrentAudioInputLevel(Number(newLevel));
        }}
      />
    </MenuBarExtra>
=======
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
>>>>>>> ef1618f9 (added show menubar icon only if muted, issue #8832)
  );

  return preferences.hideIconWhenUnmuted ? (
    currentAudioInputLevel == 0 ? (
      <CommonMenuItems />
    ) : null
  ) : (
    <CommonMenuItems />
  );
}
