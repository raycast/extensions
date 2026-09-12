import React, { useState } from "react";
import { avatarInit, AvatarOptions } from "./types/types";
import { createAvatarURL } from "./hooks/hooks";
import { AvatarGridLayout } from "./components/avatar-grid-layout";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { AvatarListLayout } from "./components/avatar-list-layout";

export default function GenerateAvatar() {
  const { layout } = getPreferenceValues<Preferences>();
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptions>(avatarInit);
  const { diceBearAvatarInfo, multiAvatarInfo, loading } = createAvatarURL(avatarOptions);

  return layout === "Grid" ? (
    <AvatarGridLayout
      loading={loading}
      avatarOptions={avatarOptions}
      setAvatarOptions={setAvatarOptions}
      multiAvatarInfo={multiAvatarInfo}
      diceBearAvatarInfo={diceBearAvatarInfo}
    />
  ) : (
    <AvatarListLayout
      loading={loading}
      avatarOptions={avatarOptions}
      setAvatarOptions={setAvatarOptions}
      multiAvatarInfo={multiAvatarInfo}
      diceBearAvatarInfo={diceBearAvatarInfo}
    />
  );
}
