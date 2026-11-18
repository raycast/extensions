import { Action, Icon } from "@raycast/api";
import { downloadToDownloads } from "./download";
import { buildCoordinatesText, buildLinksText } from "./format";

type Props = {
  exportFilePath: string;
  tileIds: string[];
  downloadBaseName: string;
  includePaste?: boolean;
};

export function TileActions({ exportFilePath, tileIds, downloadBaseName, includePaste = true }: Props) {
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Image to Clipboard"
        content={{ file: exportFilePath }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      {includePaste && <Action.Paste title="Paste Image to Active App" content={{ file: exportFilePath }} />}
      <Action.CopyToClipboard
        title="Copy Links to Clipboard"
        icon={Icon.Link}
        content={buildLinksText(tileIds)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      />
      <Action.CopyToClipboard
        title="Copy Coordinates to Clipboard"
        icon={Icon.Pin}
        content={buildCoordinatesText(tileIds)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
      />
      <Action
        title="Download to Downloads Folder"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => downloadToDownloads(exportFilePath, downloadBaseName)}
      />
    </>
  );
}
