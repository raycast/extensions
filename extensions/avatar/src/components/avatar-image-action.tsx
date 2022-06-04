import { Action, ActionPanel, Clipboard, Icon, showHUD } from "@raycast/api";
import { downloadAndCopyImage, downloadImage } from "../utils/common-utils";
import React, { Dispatch, SetStateAction } from "react";
import { AvatarOptions } from "../types/types";
import AdvancedOptionsPage from "../advanced-options-page";

export function AvatarImageAction(props: {
  avatarOptions: AvatarOptions;
  setAvatarOptions: Dispatch<SetStateAction<AvatarOptions>>;
  svgURL: string;
  pngURL: string;
}) {
  const { avatarOptions, setAvatarOptions, svgURL, pngURL } = props;
  return (
    <>
      <Action
        icon={Icon.Link}
        title={"Copy SVG URL"}
        onAction={() => {
          Clipboard.copy(svgURL).then(() => {
            showHUD("SVG URL copied to clipboard").then();
          });
        }}
      />
      <Action
        icon={Icon.Link}
        title={"Copy PNG URL"}
        onAction={() => {
          Clipboard.copy(pngURL).then(() => {
            showHUD("PNG URL copied to clipboard").then();
          });
        }}
      />
      <Action.Push
        icon={Icon.MemoryChip}
        title={"Advanced Options"}
        shortcut={{ modifiers: ["ctrl"], key: "a" }}
        target={<AdvancedOptionsPage avatarOptions={avatarOptions} setAvatarOptions={setAvatarOptions} />}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.Clipboard}
          title={"Copy SVG Avatar"}
          shortcut={{ modifiers: ["ctrl"], key: "s" }}
          onAction={() => {
            downloadAndCopyImage(svgURL, "svg").then();
          }}
        />
        <Action
          icon={Icon.Clipboard}
          title={"Copy PNG Avatar"}
          shortcut={{ modifiers: ["ctrl"], key: "p" }}
          onAction={() => {
            downloadAndCopyImage(pngURL, "png").then();
          }}
        />
        <Action
          icon={Icon.Download}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "s" }}
          title={"Download SVG Avatar"}
          onAction={() => {
            downloadImage(svgURL, "svg", avatarOptions.seed).then();
          }}
        />
        <Action
          icon={Icon.Download}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "p" }}
          title={"Download PNG Avatar"}
          onAction={() => {
            downloadImage(pngURL, "png", avatarOptions.seed).then();
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
