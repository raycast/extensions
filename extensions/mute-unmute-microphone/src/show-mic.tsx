import { MenuBarExtra, Cache, Icon, showHUD, Color } from "@raycast/api";
import { useState } from "react";
import { runAppleScript } from "@raycast/utils";
const cache = new Cache({
  namespace: "mic",
});

export default function Command() {
  const volume = cache.get("inputVolume");
  const [currentVolume, setCurrentVolume] = useState<number>(Number(volume) || 0);

  runAppleScript("input volume of (get volume settings)").then((result) => {
    if (!isNaN(Number(result))) {
      setCurrentVolume(Number(result));
      cache.set("inputVolume", result);
    }
  });

  const toggle = async () => {
    await runAppleScript(`
    set inputVolume to input volume of (get volume settings)
  if inputVolume = 0 then
      set inputVolume to 100
  else
      set inputVolume to 0
  end if
  set volume input volume inputVolume`);
    const getVolume = await runAppleScript(`get input volume of (get volume settings)`);
    setCurrentVolume(Number(getVolume));
    cache.set("inputVolume", getVolume);
    await showHUD(`Set input volume to ${getVolume}%`);
  };

  const mute = async () => {
    await runAppleScript(`tell application "System Events" to set volume input volume 0`);
    cache.set("inputVolume", "0");
    setCurrentVolume(0);
    await showHUD("Set input volume to 0%");
  };

  const unmute = async () => {
    await runAppleScript(`tell application "System Events" to set volume input volume 100`);
    cache.set("inputVolume", "100");
    setCurrentVolume(100);
    await showHUD("Set input volume to 100%");
  };
  return (
    <MenuBarExtra
      icon={
        currentVolume === 0
          ? { source: Icon.MicrophoneDisabled, tintColor: Color.Red }
          : { source: Icon.Microphone, tintColor: Color.Green }
      }
    >
      <MenuBarExtra.Item title="Toggle" onAction={toggle} />
      <MenuBarExtra.Item title="Mute" onAction={mute} />
      <MenuBarExtra.Item title="Unmute" onAction={unmute} />
    </MenuBarExtra>
  );
}
