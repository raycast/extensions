import { Action, ActionPanel, closeMainWindow, Detail, environment, showHUD } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "fs/promises";
import { runAppleScript } from "run-applescript";
import { formatByte } from "../lib/formatByte";

export type DecodeImagePreviewProps = {
  base64: string;
};

export default function DecodeImagePreview({ base64 }: DecodeImagePreviewProps) {
  const imageBuffer = useMemo(() => Buffer.from(base64, "base64"), [base64]);
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supportPath = environment.supportPath;
      const ext = base64.split(",")[0].split(":")[1].split(";")[0].split("/")[1];
      const path = supportPath.endsWith("/") ? `${supportPath}tmp.${ext}` : `${supportPath}/tmp.${ext}`;

      await fs.writeFile(path, base64.split(",")[1], "base64");

      setPath(path);
    })();

    return () => {
      closeMainWindow();
    };
  }, []);

  return (
    <Detail
      markdown={`![](${base64})`}
      navigationTitle="Image Preview"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Size"
            text={imageBuffer == null ? "-" : formatByte(imageBuffer?.byteLength ?? 0)}
          />
        </Detail.Metadata>
      }
      actions={
        path != null && (
          <ActionPanel title="Base64">
            <Action
              title="Copy Image"
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                if (path == null) {
                  return;
                }
                await runAppleScript(`
                  set imageFilePath to "${path}"
                  set theFile to POSIX file imageFilePath as alias
                  set the clipboard to (read theFile as "TIFF")
                `);
                await fs.unlink(path);
                await showHUD("Copied to Clipboard 👋");
              }}
            />
            <Action.Open title="Open" target={path} />
            <Action.Open title="Show in Finder" target={path.split("/").slice(0, -1).join("/")} />
          </ActionPanel>
        )
      }
    />
  );
}
