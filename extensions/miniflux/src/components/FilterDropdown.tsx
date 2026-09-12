import { List, Icon } from "@raycast/api";
import { useCategories } from "../utils/useCategories";

const feedStatus = [
  { title: "All", value: "all", icon: Icon.Filter },
  { title: "Unread", value: "unread", icon: Icon.Circle },
  { title: "Read", value: "read", icon: Icon.Checkmark },
  { title: "Starred", value: "starred", icon: Icon.Star },
];

type FilterDropdownProps = {
  handleFilter: (value: string) => void;
  filter: "status" | "categories";
};

const FilterDropdown = ({ handleFilter, filter }: FilterDropdownProps) => {
  const categories = useCategories();

  if (filter === "status") {
    return (
      <List.Dropdown storeValue={false} tooltip="Filter by entry's status" defaultValue="all" onChange={handleFilter}>
        {feedStatus.map(({ value, title, icon }) => (
          <List.Dropdown.Item key={value} title={title} value={value} icon={icon} />
        ))}
      </List.Dropdown>
    );
  }

  return (
    <List.Dropdown storeValue={false} tooltip="Filter by category" defaultValue="showAll" onChange={handleFilter}>
      <List.Dropdown.Item key="showAll" title="All" value="showAll" icon={Icon.Filter} />
      {categories.map(({ id, title }) => (
        <List.Dropdown.Item key={id} title={title} value={title} />
      ))}
    </List.Dropdown>
  );
};

export default FilterDropdown;
