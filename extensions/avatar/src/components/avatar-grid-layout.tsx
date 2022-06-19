import { Action, ActionPanel, Icon, Grid, getPreferenceValues } from "@raycast/api";
import { isEmpty } from "../utils/common-utils";
import React, { Dispatch, SetStateAction, useState } from "react";
import { AvatarInfo, avatarInit, AvatarOptions } from "../types/types";
import { AVATAR_URL, avatarStyles, defaultSeed, filterTags } from "../utils/constants";
import { ActionToMultiAvatar } from "./action-to-multi-avatar";
import { ActionToDiceBearAvatars } from "./action-to-dice-bear-avatars";
import { AvatarImageAction } from "./avatar-image-action";
import { Preferences } from "../types/preferences";
import { options } from "../hooks/hooks";

export function AvatarGridLayout(props: {
  loading: boolean;
  avatarOptions: AvatarOptions;
  setAvatarOptions: Dispatch<SetStateAction<AvatarOptions>>;
  multiAvatarInfo: AvatarInfo;
  diceBearAvatarInfo: AvatarInfo;
}) {
  const { itemSize } = getPreferenceValues<Preferences>();
  const { loading, avatarOptions, setAvatarOptions, multiAvatarInfo, diceBearAvatarInfo } = props;
  const [tag, setTag] = useState<string>("");
  return (
    <Grid
      isLoading={loading}
      itemSize={itemSize as Grid.ItemSize}
      searchBarPlaceholder={"Enter custom seed, don't use sensitive or personal data as seeds"}
      onSearchTextChange={(newValue) => {
        const _avatarOptions = { ...avatarOptions };
        if (isEmpty(newValue)) {
          _avatarOptions.seed = defaultSeed;
        } else {
          _avatarOptions.seed = newValue;
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
      enableFiltering={false}
      throttle={true}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip={"Avatar Sources"}
          storeValue={true}
          onChange={(newValue) => {
            setTag(newValue);
          }}
        >
          {filterTags.map((value) => {
            return <Grid.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </Grid.Dropdown>
      }
    >
      {(tag === filterTags[0].value || tag === filterTags[1].value) && (
        <Grid.Item
          id={"multiAvatar"}
          content={{
            value: encodeURI(multiAvatarInfo.svg),
            tooltip: `Designer: Gie Katon, License: MULTIAVATAR LICENSE v1.0`,
          }}
          title={"multiavatar"}
          actions={
            <ActionPanel>
              <AvatarImageAction
                avatarOptions={avatarOptions}
                setAvatarOptions={setAvatarOptions}
                avatarInfo={multiAvatarInfo}
                advancedOptions={true}
              />
              <ActionToMultiAvatar avatarURL={multiAvatarInfo.svg} />
            </ActionPanel>
          }
        />
      )}
      {(tag === filterTags[0].value || tag === filterTags[2].value) &&
        avatarStyles.map((value) => {
          return (
            <Grid.Item
              id={value.name}
              key={value.name}
              content={{
                value:
                  AVATAR_URL + "/" + value.name + "/" + encodeURI(avatarOptions.seed) + ".png" + options(avatarOptions),
                tooltip: `Designer: ${value.designer}, License: ${value.license.name}`,
              }}
              title={value.name}
              actions={
                <ActionPanel>
                  <AvatarImageAction
                    avatarOptions={avatarOptions}
                    setAvatarOptions={setAvatarOptions}
                    avatarInfo={diceBearAvatarInfo}
                    advancedOptions={true}
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
                  <ActionToDiceBearAvatars avatarURL={diceBearAvatarInfo.svg} />
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
