import { ListOrGridDropdown, ListOrGridDropdownItem, ListOrGridDropdownSection } from "./listgrid";

export function FilterDropdown({
  onChange,
  defaultValue,
}: {
  onChange?: (value: string) => void;
  defaultValue?: string | undefined;
}) {
  return (
    <ListOrGridDropdown tooltip="Filter" onChange={onChange} defaultValue={defaultValue}>
      <ListOrGridDropdownSection title="Sorted By">
        <ListOrGridDropdownItem title="Relevance" value="relevance" />
        <ListOrGridDropdownItem title="Date" value="date" />
        <ListOrGridDropdownItem title="View Count" value="viewCount" />
        <ListOrGridDropdownItem title="Rating" value="rating" />
        <ListOrGridDropdownItem title="Video Count" value="videoCount" />
      </ListOrGridDropdownSection>
    </ListOrGridDropdown>
  );
}
