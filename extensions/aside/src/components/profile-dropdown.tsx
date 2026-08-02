import { List } from "@raycast/api";
import type { AsideProfile } from "../lib/profiles";

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
          icon="👤"
          keywords={[profile.directory]}
        />
      ))}
    </List.Dropdown>
  );
}
