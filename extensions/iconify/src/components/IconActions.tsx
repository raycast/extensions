import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { copyToClipboard, toURL } from "../utils";
import { primaryActionEnum } from "../types";
import { PropsWithChildren } from "react";

const { primaryAction } = getPreferenceValues<Preferences>();

type IconActionProps = PropsWithChildren<{
  id: string;
  setId?: string;
  svgIcon: string;
  dataURIIcon: string;
}>;

export const IconActions = ({ id, setId, dataURIIcon, svgIcon, children }: IconActionProps) => {
  const paste = <Action.Paste title="Paste SVG String" content={svgIcon} />;
  const copy = <Action.CopyToClipboard title="Copy SVG String" content={svgIcon} />;
  const pasteFile = (
    <Action
      title="Paste SVG File"
      icon={Icon.Clipboard}
      onAction={async () => {
        const res = await copyToClipboard(svgIcon, id);
        if (!res) {
          return;
        }
        const { file } = await Clipboard.read();
        if (file) {
          Clipboard.paste({ file: file.replace("file://", "") });
        }
      }}
    />
  );
  const copyFile = (
    <Action
      title="Copy SVG File"
      icon={Icon.Clipboard}
      onAction={async () => {
        const res = await copyToClipboard(svgIcon, id);
        if (!res) {
          return;
        }
        await showToast({
          title: "Copied to clipboard",
          message: "The SVG file has been copied to the clipboard.",
          style: Toast.Style.Success,
        });
      }}
    />
  );
  const pasteName = setId ? <Action.Paste title="Paste Name" content={`${setId}:${id}`} /> : null;
  const copyName = setId ? <Action.CopyToClipboard title="Copy Name" content={`${setId}:${id}`} /> : null;
  const copyURL = setId ? <Action.CopyToClipboard title="Copy URL" content={toURL(setId, id)} /> : null;
  const copyDataURI = <Action.CopyToClipboard title="Copy Data URI" content={dataURIIcon} />;
  return (
    <ActionPanel>
      {primaryAction === primaryActionEnum.paste && (
        <>
          {paste}
          {copy}
          {pasteFile}
          {copyFile}
          {pasteName}
          {copyName}
          {copyURL}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.copy && (
        <>
          {copy}
          {paste}
          {pasteFile}
          {copyFile}
          {pasteName}
          {copyName}
          {copyURL}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.pasteName && (
        <>
          {pasteName}
          {paste}
          {copy}
          {pasteFile}
          {copyFile}
          {copyName}
          {copyURL}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.pasteFile && (
        <>
          {pasteFile}
          {paste}
          {copy}
          {copyFile}
          {pasteName}
          {copyName}
          {copyURL}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.copyFile && (
        <>
          {copyFile}
          {paste}
          {copy}
          {pasteFile}
          {pasteName}
          {copyName}
          {copyURL}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.copyName && (
        <>
          {copyName}
          {paste}
          {copy}
          {pasteFile}
          {copyFile}
          {pasteName}
          {copyURL}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.copyURL && (
        <>
          {copyURL}
          {paste}
          {copy}
          {pasteFile}
          {copyFile}
          {pasteName}
          {copyName}
          {copyDataURI}
        </>
      )}
      {primaryAction === primaryActionEnum.copyDataURI && (
        <>
          {copyDataURI}
          {paste}
          {copy}
          {pasteFile}
          {copyFile}
          {pasteName}
          {copyName}
          {copyURL}
        </>
      )}
      {children}
    </ActionPanel>
  );
};
