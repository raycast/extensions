import {
  Color,
  Icon,
  MenuBarExtra,
  getPreferenceValues,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { toggleSystemAudioInputLevel } from "./utils";
import { AudioInputLevelCache } from "./audio-input-level-cache";

export default function muteMenuBar() {
  const preferences = getPreferenceValues<Preferences.MuteMenuBar>();
  const [isMuted, setIsMuted] = useState<boolean>(AudioInputLevelCache.curInputLevel === "0");

  useEffect(() => {
    const updateIconVisibility = () => {
      const currentAudioInputLevelCached = AudioInputLevelCache.curInputLevel;
      setIsMuted(currentAudioInputLevelCached === "0");
    };

    AudioInputLevelCache.addListener(updateIconVisibility);

    return () => {
      AudioInputLevelCache.removeListener(updateIconVisibility);
    };
  }, []);

  const iconColor = preferences.tint === "true" ? Color.Red : Color.PrimaryText;
  const disabledIcon = { source: Icon.MicrophoneDisabled, tintColor: iconColor };
  const enabledIcon = { source: Icon.Microphone };
  const icon = isMuted ? disabledIcon : enabledIcon;
  const menuItemText = isMuted ? "Unmute" : "Mute";

  const handleToggleIconButton = async () => {
    if (isMuted) {
      AudioInputLevelCache.curInputLevel = AudioInputLevelCache.prevInputLevel;
    } else {
      AudioInputLevelCache.prevInputLevel = AudioInputLevelCache.curInputLevel;
      AudioInputLevelCache.curInputLevel = "0";
    }
    await toggleSystemAudioInputLevel();
    setIsMuted(!isMuted);
  };

  if (preferences.hideIconWhenUnmuted && !isMuted) {
    return null;
  }

  return (
    <MenuBarExtra icon={icon} tooltip="Audio input volume">
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={menuItemText} onAction={handleToggleIconButton} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Configure default level" onAction={openExtensionPreferences} />
        <MenuBarExtra.Item icon={Icon.Gear} title="Settings" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
