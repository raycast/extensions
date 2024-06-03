import { Color, Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useState } from "react";
import { toggleSystemAudioInputLevel } from "./utils";
import { AudioInputLevelCache } from "./audio-input-level-cache";

export default function muteMenuBar() {
  const preferences = getPreferenceValues<Preferences.MuteMenuBar>();
  const currentAudioInputLevelCached = AudioInputLevelCache.curInputLevel;

  if (preferences.hideIconWhenUnmuted && currentAudioInputLevelCached !== "0") {
    return;
  }

  const disabledIcon = { source: Icon.MicrophoneDisabled, tintColor: Color.Red };
  const enabledIcon = { source: Icon.Microphone };

  const [isMuted, setIsMuted] = useState<boolean>(currentAudioInputLevelCached === "0");
  const icon = isMuted ? disabledIcon : enabledIcon;
  const menuItemText = isMuted ? "Unmute" : "Mute";

  function CommonMenuItems() {
    return (
      <MenuBarExtra icon={icon} tooltip="Audio input volume">
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={menuItemText}
            onAction={async () => {
              setIsMuted((isMuted) => !isMuted);
              await toggleSystemAudioInputLevel();
            }}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Settings..." onAction={openCommandPreferences} />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return <CommonMenuItems />;
}
