import { Action, Icon } from "@raycast/api";
import { stopAudio } from "../../lib/audio";
import { Sample } from "../../lib/types";

interface CopyUrlActionProps {
  sample: Sample;
}

export function CopyUrlAction({ sample }: CopyUrlActionProps) {
  const handleCopyUrl = async () => {
    // Stop any currently playing audio
    await stopAudio();
  };

  return <Action.CopyToClipboard content={sample.sample} title="Copy URL" icon={Icon.Link} onCopy={handleCopyUrl} />;
}
