import { Action, Clipboard, Icon, showHUD } from "@raycast/api";
import { downloadAndCopyImage, downloadImage } from "../utils/common-utils";
import React from "react";

export function ImageAction(props: {
  imageURL: string;
  primaryAction: string;
  autoRefresh: boolean;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { imageURL, primaryAction, autoRefresh, setRefresh } = props;
  return (
    <>
      <Action
        icon={Icon.Clipboard}
        title={primaryAction === "Copy Image URL" ? "Copy Image URL" : "Copy Image"}
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
        title={primaryAction === "Copy Image URL" ? "Copy Image" : "Copy Image URL"}
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
          downloadImage(imageURL).then();
          if (autoRefresh) {
            setRefresh(Date.now());
          }
        }}
      />
    </>
  );
}
