import { Icon, List } from "@raycast/api";
import { ProfileList } from "../types";
import { useEffect } from "react";
import { idToColor } from "../utils";

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
      <List.Dropdown.Item value={profiles.default.id} title={profiles.default.name} />
      {profiles.profiles.map((profile) => (
        <List.Dropdown.Item
          value={profile.id}
          title={profile.name}
          icon={{ source: Icon.PersonCircle, tintColor: idToColor(profile.color) }}
        />
      ))}
    </List.Dropdown>
  );
}
