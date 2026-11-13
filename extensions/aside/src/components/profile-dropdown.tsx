import { List } from "@raycast/api";
import type { AsideProfile } from "../lib/profiles";

const PROFILE_AVATARS = [
  "profile-avatar-blue.svg",
  "profile-avatar-purple.svg",
  "profile-avatar-green.svg",
  "profile-avatar-orange.svg",
  "profile-avatar-magenta.svg",
  "profile-avatar-yellow.svg",
];

function getProfileAvatar(directory: string): string {
  if (directory === "Default") return PROFILE_AVATARS[0];

  const profileNumber = /^Profile (\d+)$/.exec(directory)?.[1];
  if (profileNumber) return PROFILE_AVATARS[Number(profileNumber) % PROFILE_AVATARS.length];

  let hash = 0;
  for (const character of directory) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return PROFILE_AVATARS[hash % PROFILE_AVATARS.length];
}

interface ProfileDropdownProps {
  profiles: AsideProfile[];
  value: string;
  onChange: (profile: string) => void;
  tooltip?: string;
}

export function ProfileDropdown({ profiles, value, onChange, tooltip = "Aside Profile" }: ProfileDropdownProps) {
  return (
    <List.Dropdown tooltip={tooltip} value={value} onChange={onChange}>
      {profiles.map((profile) => (
        <List.Dropdown.Item
          key={profile.directory}
          value={profile.directory}
          title={profile.name}
          icon={getProfileAvatar(profile.directory)}
          keywords={[profile.directory]}
        />
      ))}
    </List.Dropdown>
  );
}
