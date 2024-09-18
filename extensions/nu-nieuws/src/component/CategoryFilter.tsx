import { List } from "@raycast/api";
import { Feed } from "../util/feeds";

interface CategoryFilterProps {
  feeds: Feed[];
  onFilterChange: (newValue: string) => void;
}

const CategoryFilter = ({ feeds, onFilterChange }: CategoryFilterProps) => {
  return (
    <List.Dropdown
      tooltip="Filter Category"
      storeValue={true}
      onChange={(newValue) => {
        onFilterChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Filter Category">
        <List.Dropdown.Item key="all" title="..." value="all" />
        {feeds.map((feed) => (
          <List.Dropdown.Item key={feed.id} title={feed.name} value={feed.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default CategoryFilter;
