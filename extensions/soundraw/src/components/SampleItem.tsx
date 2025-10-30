import { useState } from "react";
import { List, Icon, ActionPanel } from "@raycast/api";
import { Sample } from "../lib/types";
import { usePlaybackState } from "../lib/hooks";
import { CopyFileAction } from "./actions/CopyFileAction";
import { CopyUrlAction } from "./actions/CopyUrlAction";
import { OpenInBrowserAction } from "./actions/OpenInBrowserAction";
import { PlayStopAction } from "./actions/PlayStopAction";
import * as fs from "fs";

export function SampleItem({ sample, filePath }: { sample: Sample; filePath: string | null }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const isPlaying = usePlaybackState(sample.id);

  // Verify file exists before setting quickLook (files might not be ready yet)
  const verifiedFilePath = filePath && fs.existsSync(filePath) ? filePath : null;

  return (
    <List.Item
      id={sample.id}
      key={sample.id}
      title={sample.name.replace(/\s+\d+$/, "")}
      icon={isDownloading ? Icon.Clock : isPlaying ? Icon.SpeakerOn : Icon.Music}
      accessories={[...(sample.bpm ? [{ text: `${sample.bpm} BPM`, icon: Icon.Clock }] : [])]}
      quickLook={verifiedFilePath ? { path: verifiedFilePath } : undefined}
      actions={
        <ActionPanel>
          <CopyFileAction sample={sample} onLoadingChange={setIsDownloading} />
          <CopyUrlAction sample={sample} />
          <OpenInBrowserAction sample={sample} />
          <PlayStopAction sample={sample} />
        </ActionPanel>
      }
    />
  );
}
