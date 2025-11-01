import { Icon, List } from "@raycast/api";
import { SortBy } from "@/types";

type SortingDropDownProps = {
  setSortBy: (sortBy: SortBy) => void;
};

export const SortingDropDown = ({ setSortBy }: SortingDropDownProps) => {
  return (
    <List.Dropdown tooltip="Sort" storeValue onChange={(value) => setSortBy(value as SortBy)}>
      <List.Dropdown.Item title="Default Sort" value="none" />
      <List.Dropdown.Item title="Last Changed (Newest First)" value="changed_des" icon={Icon.ArrowUp} />
      <List.Dropdown.Item title="Last Changed (Oldest First)" value="changed_asc" icon={Icon.ArrowDown} />
      <List.Dropdown.Item title="Last Checked (Newest First)" value="checked_des" icon={Icon.ArrowUp} />
      <List.Dropdown.Item title="Last Checked (Oldest First)" value="checked_asc" icon={Icon.ArrowDown} />
    </List.Dropdown>
  );
};
