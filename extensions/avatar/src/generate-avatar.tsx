import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import React, { useState } from "react";
import { ActionToDiceBearAvatars } from "./components/action-to-dice-bear-avatars";
import { AVATAR_URL, avatarStyles, defaultSeed } from "./utils/constants";
import { avatarInit, AvatarOptions } from "./types/types";
import { isEmpty } from "./utils/common-utils";
import { AvatarImageAction } from "./components/avatar-image-action";
import { createAvatarURL } from "./hooks/hooks";
import Mask = Image.Mask;

export default function GenerateAvatar() {
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptions>(avatarInit);
  const { avatarURL } = createAvatarURL(avatarOptions);

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder={"Enter custom seed, don't use sensitive or personal data as seeds"}
      onSearchTextChange={(newValue) => {
        const _avatarOptions = { ...avatarOptions };
        if (isEmpty(newValue)) {
          _avatarOptions.seed = defaultSeed;
        } else {
          _avatarOptions.seed = encodeURI(newValue);
        }
        setAvatarOptions(_avatarOptions);
      }}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _avatarOptions = { ...avatarOptions };
          _avatarOptions.style = id;
          setAvatarOptions(_avatarOptions);
        }
      }}
      throttle={true}
    >
      {avatarStyles.map((value) => {
        return (
          <List.Item
            id={value.name}
            key={value.name}
            icon={{
              source: AVATAR_URL + "/" + value.name + "/" + value.name + defaultSeed + ".png",
              mask: Mask.RoundedRectangle,
            }}
            title={{
              value: value.name,
              tooltip: `Designer: ${value.designer}, License: ${value.license.name}`,
            }}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`<img src="${avatarURL.png}" alt="" height="190" />`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={value.title} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Designer" text={value.designer} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={"License"} text={value.license.name} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="URL" text={avatarURL.svg} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <AvatarImageAction
                  avatarOptions={avatarOptions}
                  setAvatarOptions={setAvatarOptions}
                  svgURL={avatarURL.svg}
                  pngURL={avatarURL.png}
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title={"Reset Options"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
                  onAction={() => {
                    const _avatar = { ...avatarInit };
                    _avatar.style = avatarOptions.style;
                    setAvatarOptions(_avatar);
                  }}
                />
                <ActionToDiceBearAvatars avatarURL={avatarURL.svg} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
