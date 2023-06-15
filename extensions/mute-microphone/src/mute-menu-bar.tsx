import { Cache, Icon, MenuBarExtra } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useState } from "react";
import { toggleSystemAudioInputLevel } from "./shared/utils";

export default function muteMenuBar() {
  const cache = new Cache();
  const cachedValue = cache.get("currentAudioInputLevel");
  const cachedValueNumber = cachedValue == undefined ? 100 : Number(cachedValue);

  const [currentAudioInputLevel, setCurrentAudioInputLevel] = useState<number>(cachedValueNumber);
  const icon = currentAudioInputLevel == 0 ? Icon.MicrophoneDisabled : Icon.Microphone;
  const menuItemText = currentAudioInputLevel == 0 ? "Unmute" : "Mute";

  runAppleScript("input volume of (get volume settings)").then((result) => {
    if (!isNaN(Number(result))) {
      setCurrentAudioInputLevel(Number(result));
      cache.set("currentAudioInputLevel", result);
    }
  });

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
  );
}
