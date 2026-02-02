import { List } from "@raycast/api";

import { ProfileDropdownProps } from "../../lib/types";
import { formatCategoryName } from "../../lib/utils";

const ProfileDropdown = ({ profiles, onProfileChange }: ProfileDropdownProps) => (
  <List.Dropdown tooltip="Select Profile" storeValue onChange={(newValue) => onProfileChange(newValue)}>
    {profiles.map((profile) => (
      <List.Dropdown.Item key={profile} title={formatCategoryName(profile)} value={profile} />
    ))}
  </List.Dropdown>
);

export default ProfileDropdown;
