import { Profile } from "../types";
import { Action, ActionPanel } from "@raycast/api";
import React from "react";

type ProfileActionsProps = {
  profile: Profile;
  isActivated: boolean;
  onConnect: (profile: Profile) => void;
  onDisconnect: (profile: Profile) => void;
};

export const ProfileActions: React.FunctionComponent<ProfileActionsProps> = ({ profile, isActivated, onConnect, onDisconnect }) => {
  const title = isActivated ? "Disconnect" : "Connect";
  return (
    <ActionPanel>
      <Action autoFocus title={title} onAction={() => isActivated ? onDisconnect(profile) : onConnect(profile)} />
    </ActionPanel>
  )
}
