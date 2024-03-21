import { Icon, List } from "@raycast/api";
import { Profile, ProfileList } from "../types";
import { useEffect } from "react";
import { idToColor } from "../utils";

function ProfileItem(props: { profile: Profile }) {
  return (
    <List.Dropdown.Item
      value={props.profile.id}
      title={props.profile.name}
      icon={{ source: Icon.PersonCircle, tintColor: idToColor(props.profile.color) }}
    />
  );
}

export default function ProfileDropDown(props: {
  profiles?: ProfileList;
  selectedProfileId?: string;
  onProfileSelected?: (profileId: string) => void;
}) {
  const { profiles, selectedProfileId, onProfileSelected } = props;

  useEffect(() => {
    if (selectedProfileId) {
      onProfileSelected?.(selectedProfileId);
    }
  }, [selectedProfileId]);

  if (!profiles) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select Profile" value={selectedProfileId} onChange={onProfileSelected}>
      <ProfileItem profile={profiles.default} />
      {profiles.profiles.map((profile) => (
        <ProfileItem profile={profile} />
      ))}
    </List.Dropdown>
  );
}
