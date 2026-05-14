import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  LaunchType,
  open,
} from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";
import { copyToClipboard, toURL } from "../utils";
import { iconFormatsMap } from "../utils/format-name";
import { primaryActionEnum, Preferences } from "../types";
import { PropsWithChildren } from "react";

const { primaryAction, iconNameFormat } = getPreferenceValues<Preferences>();

type IconActionProps = PropsWithChildren<{
  id: string;
  setId?: string;
  svgIcon: string;
  dataURIIcon: string;
  from?: string;
}>;

export const IconActions = ({ id, setId, dataURIIcon, svgIcon, from, children }: IconActionProps) => {
  const formattedIconName = setId ? iconFormatsMap[iconNameFormat]({ setId, iconId: id }) : id;
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
  const pasteName = setId ? <Action.Paste title="Paste Name" content={formattedIconName} /> : null;
  const copyName = setId ? <Action.CopyToClipboard title="Copy Name" content={formattedIconName} /> : null;
  const copyURL = setId ? <Action.CopyToClipboard title="Copy URL" content={toURL(setId, id)} /> : null;
  const copyDataURI = <Action.CopyToClipboard title="Copy Data URI" content={dataURIIcon} />;

  function ToolsActionSection() {
    const pickColor = (
      <Action
        title="Pick Color"
        icon={Icon.EyeDropper}
        onAction={async () => {
          try {
            await crossLaunchCommand({
              name: "pick-color",
              type: LaunchType.UserInitiated,
              extensionName: "color-picker",
              ownerOrAuthorName: "thomas",
              context: {
                copyToClipboard: false,
                callbackLaunchOptions: from
                  ? {
                      name: from,
                      type: LaunchType.Background,
                    }
                  : undefined,
              },
            });
          } catch {
            open("raycast://extensions/thomas/color-picker");
          }
        }}
      />
    );

    return <ActionPanel.Section title="Tools">{pickColor}</ActionPanel.Section>;
  }

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
      <ToolsActionSection />
      {children}
    </ActionPanel>
  );
};
