import { Icon, MenuBarExtra } from "@raycast/api";
import { cache } from "./cache";
import { stopRecording } from "./recorder";

cache.subscribe((key, value) => {
  console.log(key, value);
  if (key === "recording") {
    console.log("recording", value);
  }
});

export default function Command() {
  const isRecording = Boolean(cache.get("recording"));

  return (
    <MenuBarExtra icon={isRecording ? Icon.StopFilled : Icon.MicrophoneDisabled}>
      {isRecording && <MenuBarExtra.Item onAction={stopRecording} title="Stop Recording" />}
    </MenuBarExtra>
  );
}
