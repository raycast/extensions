import { MenuBarExtra, showHUD, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCurrentInputVolume, toggleMicrophone } from "./lib/mic-utils";

export default function Command() {
  const { data: inputVolume, isLoading, revalidate } = useCachedPromise(getCurrentInputVolume);

  const handleToggle = async () => {
    try {
      await toggleMicrophone();
      await revalidate();
    } catch (error) {
      console.error("Failed to toggle microphone:", error);
      await showHUD("❌ Failed to toggle microphone");
    }
  };

  const isMuted = inputVolume === 0;
  const menuBarIcon = isMuted ? Icon.MicrophoneDisabled : Icon.Microphone;

  return (
    <MenuBarExtra icon={menuBarIcon} isLoading={isLoading}>
      <MenuBarExtra.Item title={isMuted ? "Unmute Microphone" : "Mute Microphone"} onAction={handleToggle} />
      {inputVolume !== undefined && <MenuBarExtra.Item title={`Volume: ${inputVolume}%`} />}
    </MenuBarExtra>
  );
}
