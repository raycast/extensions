import { Action, Icon, Keyboard } from "@raycast/api";
import { stopAudio } from "../../lib/audio";
import { Sample } from "../../lib/types";

interface OpenInBrowserActionProps {
  sample: Sample;
}

export function OpenInBrowserAction({ sample }: OpenInBrowserActionProps) {
  const handleOpenInBrowser = async () => {
    // Stop any currently playing audio
    await stopAudio();
  };

  return (
    <Action.OpenInBrowser
      url={sample.sample}
      title="Open in Browser"
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.Open}
      onOpen={handleOpenInBrowser}
    />
  );
}
