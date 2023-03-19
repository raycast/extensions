import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise, usePromise } from "@raycast/utils";
import fs from "fs/promises";
import sizeOf from "image-size";
import { formatByte } from "../lib/formatByte";
import { fileTypeFromBuffer } from "file-type";

export type EncodeImagePreviewProps = {
  path: string;
};

export default function EncodeImagePreview({ path }: EncodeImagePreviewProps) {
  const {
    data: buffer,
    isLoading,
    error,
  } = useCachedPromise(
    async (path) => {
      const buffer = await fs.readFile(path);
      return buffer;
    },
    [path]
  );

  const metadata = useMemo(() => {
    try {
      return buffer == null ? null : sizeOf(buffer);
    } catch (e) {
      return null;
    }
  }, [buffer]);

  const dataUri = usePromise(
    async (buffer) => {
      if (buffer == null) {
        return null;
      }
      const mimeType = await fileTypeFromBuffer(buffer);
      const dataUri =
        mimeType == null ? null : `data:${mimeType?.mime};base64,${Buffer.from(buffer).toString("base64")}`;
      return dataUri;
    },
    [buffer]
  );

  return (
    <Detail
      markdown={`![](${encodeURIComponent(path)})`}
      isLoading={isLoading}
      navigationTitle={path.split("/").at(-1)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={
              error
                ? { value: "Error", color: Color.Red }
                : dataUri == null
                ? { value: "Converting", color: Color.Yellow }
                : { value: "Completed" }
            }
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Dimensions"
            text={metadata?.width == null || metadata?.height == null ? "-" : `${metadata.width} × ${metadata.height}`}
          />
          <Detail.Metadata.Label title="Size" text={buffer == null ? "-" : formatByte(buffer?.byteLength ?? 0)} />
          <Detail.Metadata.Label title="Base64" text={dataUri.data ?? "-"} />
        </Detail.Metadata>
      }
      actions={
        dataUri.data != null && (
          <ActionPanel title="Base64">
            <Action.CopyToClipboard
              title="Copy Base64"
              content={dataUri.data}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Paste content={dataUri.data} />
          </ActionPanel>
        )
      }
    />
  );
}
