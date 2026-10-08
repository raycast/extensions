import { List } from "@raycast/api";
import { formatBytes, isFilePreviewable } from "../utils/file";
import { FileInfo } from "../types";
import { useEffect, useState } from "react";
import { readFile } from "fs/promises";

interface FileDetailMetadataProps {
  file: FileInfo | null;
}

export function FileDetailMetadata({ file }: FileDetailMetadataProps) {
  if (!file) return null;

  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      try {
        if (file?.isDirectory) return;

        const canPreview = await isFilePreviewable(file!.commandline, file!.size);

        if (canPreview) {
          const content = await readFile(file!.commandline, "utf-8");
          setPreviewContent(content);
        } else {
          setPreviewContent(null);
        }
      } catch {
        setPreviewContent(null);
      }
    }

    loadPreview();
  }, [file.commandline]);

  return (
    <List.Item.Detail
      markdown={previewContent ?? undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={file.name} />
          <List.Item.Detail.Metadata.Label title="Where" text={file.commandline} />
          <List.Item.Detail.Metadata.Separator />
          {file.size !== undefined && (
            <>
              <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(file.size)} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {file.dateCreated && (
            <List.Item.Detail.Metadata.Label title="Created" text={file.dateCreated.toLocaleString()} />
          )}
          {file.dateModified && (
            <List.Item.Detail.Metadata.Label title="Modified" text={file.dateModified.toLocaleString()} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
