import type { Dispatch, SetStateAction } from "react";
import { Action, Clipboard, Icon, showHUD } from "@raycast/api";
import { downloadAndCopyImage, downloadImage } from "@/utils/common-utils";
import { primaryAction } from "@/utils/preferences";

export function PicsumImageAction(props: {
  imageURL: string;
  size: string;
  autoRefresh?: boolean;
  setRefresh?: Dispatch<SetStateAction<number>>;
}) {
  const { imageURL, size } = props;
  const autoRefresh = typeof props.autoRefresh === "undefined" ? false : props.autoRefresh;
  const setRefresh =
    typeof props.setRefresh === "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;

  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title={primaryAction === "Copy Image URL" ? "Copy Image URL" : "Copy Image File"}
        shortcut={{
          modifiers: primaryAction === "Copy Image URL" ? ["shift", "cmd"] : ["cmd"],
          key: primaryAction === "Copy Image URL" ? "." : ".",
        }}
        onAction={() => {
          if (primaryAction === "Copy Image URL") {
            Clipboard.copy(imageURL).then(() => {
              showHUD("Image URL copied to clipboard").then();
            });
          } else {
            downloadAndCopyImage(imageURL).then();
          }
          if (autoRefresh) {
            setRefresh(Date.now());
          }
        }}
      />
      <Action
        icon={Icon.Clipboard}
        title={primaryAction === "Copy Image URL" ? "Copy Image File" : "Copy Image URL"}
        shortcut={{
          modifiers: primaryAction === "Copy Image URL" ? ["cmd"] : ["shift", "cmd"],
          key: primaryAction === "Copy Image URL" ? "." : ",",
        }}
        onAction={() => {
          if (primaryAction === "Copy Image URL") {
            downloadAndCopyImage(imageURL).then();
          } else {
            Clipboard.copy(imageURL).then(() => {
              showHUD("Image URL copied to clipboard").then();
            });
          }
          if (autoRefresh) {
            setRefresh(Date.now());
          }
        }}
      />
      <Action
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        title={"Download Image"}
        onAction={() => {
          downloadImage(imageURL, size).then();
          if (autoRefresh) {
            setRefresh(Date.now());
          }
        }}
      />
    </>
  );
}
