import {
  ActionPanel,
  Action,
  Detail,
  Clipboard,
  closeMainWindow,
  Icon,
  popToRoot,
} from "@raycast/api";
import React from "react";

interface UploadResultProps {
  fileUrl: string;
  fileName: string;
  bucketName: string;
}

export default function UploadResult({
  fileUrl,
  fileName,
  bucketName,
}: UploadResultProps) {
  const markdown = `
# 🚀 Upload Successful!

**File:** ${fileName}
**Bucket:** ${bucketName}
**Link:** [${fileUrl}](${fileUrl})

---
![Uploaded File](${fileUrl})
`;

  const handlePasteAndCopy = async () => {
    await Clipboard.copy(fileUrl);
    await Clipboard.paste(fileUrl);
    await popToRoot();
    await closeMainWindow();
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Paste & Copy"
            icon={Icon.Clipboard}
            onAction={handlePasteAndCopy}
          />
          <Action.CopyToClipboard content={fileUrl} title="Copy URL Only" />
          <Action.OpenInBrowser url={fileUrl} />
        </ActionPanel>
      }
    />
  );
}
