import { Detail, ActionPanel, Action, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ensureWadFile, downloadWadFromUrl, getWadPath } from "../utils/wad-manager";

interface DownloadPromptProps {
  onComplete: () => void;
  isRedownload?: boolean; // Flag for re-download scenario
}

function CustomUrlForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Download from URL"
            onSubmit={(values: { url: string }) => {
              onSubmit(values.url);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="WAD File URL"
        placeholder="https://example.com/doom1.wad"
        value={url}
        onChange={setUrl}
        info="Enter a direct URL to a DOOM WAD file (IWAD or PWAD)"
      />
      <Form.Description
        title="Supported Files"
        text="doom1.wad (shareware), doom.wad (registered), doom2.wad, plutonia.wad, tnt.wad"
      />
    </Form>
  );
}

export default function DownloadPrompt({ onComplete, isRedownload = false }: DownloadPromptProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { push } = useNavigation();

  const handleDefaultDownload = async () => {
    setIsDownloading(true);
    const success = await ensureWadFile();
    if (success) {
      onComplete();
    }
    setIsDownloading(false);
  };

  const handleCustomDownload = async (url: string) => {
    setIsDownloading(true);
    const success = await downloadWadFromUrl(url);
    if (success) {
      onComplete();
    }
    setIsDownloading(false);
  };

  const title = isRedownload ? "Re-download DOOM WAD File" : "DOOM Shareware Data Required";
  const instruction = isRedownload
    ? "The existing WAD file will be replaced."
    : "Press Enter to download and start playing!";

  return (
    <Detail
      markdown={`# ${title}

${
  isRedownload
    ? `**Current WAD Location:**
\`${getWadPath()}\`

Choose an option below to re-download the WAD file:`
    : `This extension requires the DOOM Shareware data file (doom1.wad) to run.

**What will be downloaded:**
- File: doom1.wad (4.2 MB)
- Source: distro.ibiblio.org (primary mirror)
- Fallback: archive.org (if primary fails)
- License: Freely distributable shareware
- Stored: \`${getWadPath()}\``
}

**${instruction}**

---

*Download options: Default (shareware) or Custom URL (advanced users)*`}
      isLoading={isDownloading}
      actions={
        <ActionPanel>
          <Action title="Download Shareware (Default)" icon={Icon.Download} onAction={handleDefaultDownload} />
          <Action
            title="Download from Custom URL"
            icon={Icon.Link}
            onAction={() => push(<CustomUrlForm onSubmit={handleCustomDownload} />)}
          />
          {isRedownload && (
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
              onAction={onComplete}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
