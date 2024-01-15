import { List } from "@raycast/api";

type FilterSection = {
  id: string;
  name: string;
  filters: Filter[];
};

type Filter = {
  id: string;
  name: string;
};

interface Props {
  onFilterChange: (filterId: string) => void;
  filterSections: FilterSection[];
  value: string;
}

const SearchFilter: React.FC<Props> = (props) => {
  const { filterSections, onFilterChange, value } = props;
  return (
    <List.Dropdown tooltip="Select Project" value={value} onChange={onFilterChange}>
      {filterSections.map((section) => {
        const renderFilters = section.filters.map((filter) => (
          <List.Dropdown.Item key={filter.id} title={filter.name} value={filter.id} />
        ));
        if (section.id === "hide") {
          return renderFilters;
        }
        return (
          <List.Dropdown.Section key={section.id} title={section.name}>
            {renderFilters}
          </List.Dropdown.Section>
        );
      })}
    </List.Dropdown>
  );
};

export default SearchFilter;
