import { Action, ActionPanel, Clipboard, Icon, showHUD } from "@raycast/api";
import { downloadAndCopyImage, downloadImage, guid } from "../utils/common-utils";
import React, { Dispatch, SetStateAction } from "react";
import { AvatarInfo, AvatarOptions } from "../types/types";
import AdvancedOptionsPage from "../advanced-options-page";

export function AvatarImageAction(props: {
  avatarOptions: AvatarOptions;
  setAvatarOptions: Dispatch<SetStateAction<AvatarOptions>>;
  avatarInfo: AvatarInfo;
  advancedOptions: boolean;
}) {
  const { avatarOptions, setAvatarOptions, avatarInfo, advancedOptions } = props;
  return (
    <>
      <Action
        icon={Icon.Link}
        title={"Copy SVG URL"}
        onAction={() => {
          Clipboard.copy(avatarInfo.svg).then(() => {
            showHUD("SVG URL copied to clipboard").then();
          });
        }}
      />
      <Action
        icon={Icon.Link}
        title={"Copy PNG URL"}
        onAction={() => {
          Clipboard.copy(avatarInfo.png).then(() => {
            showHUD("PNG URL copied to clipboard").then();
          });
        }}
      />
      <Action
        icon={Icon.TwoArrowsClockwise}
        title={"Random Seed"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => {
          const _avatarOptions = { ...avatarOptions };
          _avatarOptions.seed = guid();
          setAvatarOptions(_avatarOptions);
        }}
      />
      {advancedOptions && (
        <Action.Push
          icon={Icon.MemoryChip}
          title={"Advanced Options"}
          shortcut={{ modifiers: ["ctrl"], key: "a" }}
          target={<AdvancedOptionsPage avatarOptions={avatarOptions} setAvatarOptions={setAvatarOptions} />}
        />
      )}
      <ActionPanel.Section>
        {!advancedOptions && (
          <Action.CopyToClipboard
            icon={Icon.Terminal}
            title={"Copy SVG Code"}
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
            content={avatarInfo.svgCode}
          />
        )}
        <Action
          icon={Icon.Clipboard}
          title={"Copy SVG Avatar"}
          shortcut={{ modifiers: ["ctrl"], key: "s" }}
          onAction={() => {
            downloadAndCopyImage(avatarInfo.svg, "svg").then();
          }}
        />
        <Action
          icon={Icon.Clipboard}
          title={"Copy PNG Avatar"}
          shortcut={{ modifiers: ["ctrl"], key: "p" }}
          onAction={() => {
            downloadAndCopyImage(avatarInfo.png, "png").then();
          }}
        />
        <Action
          icon={Icon.Download}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "s" }}
          title={"Download SVG Avatar"}
          onAction={() => {
            downloadImage(avatarInfo.svg, "svg", avatarOptions.seed).then();
          }}
        />
        <Action
          icon={Icon.Download}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "p" }}
          title={"Download PNG Avatar"}
          onAction={() => {
            downloadImage(avatarInfo.png, "png", avatarOptions.seed).then();
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
