import { List } from "@raycast/api";
import { EAdminSearchType } from "../types";

interface IPortalSearchTypeDropdownProps {
  onSearchTypeChange: (searchType: EAdminSearchType) => void;
}

export default function PortalSearchTypeDropdown(props: IPortalSearchTypeDropdownProps) {
  const { onSearchTypeChange } = props;
 
  return (
    <List.Dropdown
      tooltip="Select search type"
      storeValue={true}
      onChange={(newValue) => onSearchTypeChange(newValue as EAdminSearchType)}
    >
      <List.Dropdown.Item title="User" value={EAdminSearchType.User} />
      <List.Dropdown.Item title="Rental" value={EAdminSearchType.Rental} />
      <List.Dropdown.Item title="Booking" value={EAdminSearchType.Booking} />
      <List.Dropdown.Item title="Campground" value={EAdminSearchType.Campground} />
    </List.Dropdown>
  )
}
