import { Profile } from "../types";
import { Icon, List } from "@raycast/api";
import React, { useMemo } from "react";
import { ProfileActions } from "./ProfileActions";
import { truthy } from "../utils";

type ProfileListItem = {
  profile: Profile;
  activeProfile: Profile | null;
  onConnect: (profile: Profile) => void;
  onDisconnect: (profile: Profile) => void;
};

export const ProfileListItem: React.FunctionComponent<ProfileListItem> = ({ profile, activeProfile, onConnect, onDisconnect }) => {
  const {
    id,
    name,
    client_address,
    status
  } = profile;

  const isActivated = profile.id === activeProfile?.id;
  const accessories = useMemo(() => [
    isActivated && { text: status },
    isActivated && { text: client_address },
  ].filter(truthy), [client_address, isActivated, status]);

  return (
    <List.Item
      id={id}
      icon={isActivated ? Icon.CircleFilled : Icon.Circle}
      key={id}
      title={name}
      accessories={accessories}
      actions={<ProfileActions isActivated={isActivated} profile={profile} onConnect={onConnect} onDisconnect={onDisconnect} />}
    />
  )
}
