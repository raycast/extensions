import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { ensureEngineFiles, getEngineAssetsPath } from "../utils/engine-manager";

interface EngineDownloadPromptProps {
  onComplete: () => void;
}

export default function EngineDownloadPrompt({ onComplete }: EngineDownloadPromptProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const success = await ensureEngineFiles();
    if (success) {
      onComplete();
    }
    setIsDownloading(false);
  };

  return (
    <Detail
      markdown={`# DOOM Engine Required

This extension needs to download the DOOM WebAssembly engine to run.

**What will be downloaded:**
- File: doom.js + doom.wasm (~740 KB total)
- Source: [github.com/Saketh-Chandra/raydoom-core](https://github.com/Saketh-Chandra/raydoom-core/releases/latest)
- One-time download — cached for all future launches
- Stored: \`${getEngineAssetsPath()}\`

**Press Enter to download and continue.**

---

*This is a one-time setup. The engine will be cached locally.*`}
      isLoading={isDownloading}
      actions={
        <ActionPanel>
          <Action title="Download Engine" icon={Icon.Download} onAction={handleDownload} />
        </ActionPanel>
      }
    />
  );
}
