import { ListOrGridDropdown, ListOrGridDropdownItem, ListOrGridDropdownSection } from "./listgrid";

type FilterKind = "channel" | "video";

interface FilterOption {
  title: string;
  value: string;
}

const filterOptions: Record<FilterKind, FilterOption[]> = {
  channel: [
    { title: "Relevance", value: "relevance" },
    { title: "Date", value: "date" },
    { title: "View Count", value: "viewCount" },
    { title: "Video Count", value: "videoCount" },
  ],
  video: [
    { title: "Relevance", value: "relevance" },
    { title: "Date", value: "date" },
    { title: "View Count", value: "viewCount" },
    { title: "Rating", value: "rating" },
  ],
};

export function normalizeFilterOrder(kind: FilterKind, value?: string): string {
  if (value && filterOptions[kind].some((option) => option.value === value)) {
    return value;
  }
  return "relevance";
}

export function FilterDropdown({
  kind,
  onChange,
  value,
}: {
  kind: FilterKind;
  onChange?: (value: string) => void;
  value?: string | undefined;
}) {
  return (
    <ListOrGridDropdown tooltip="Filter" onChange={onChange} value={normalizeFilterOrder(kind, value)}>
      <ListOrGridDropdownSection title="Sorted By">
        {filterOptions[kind].map((option) => (
          <ListOrGridDropdownItem key={option.value} title={option.title} value={option.value} />
        ))}
      </ListOrGridDropdownSection>
    </ListOrGridDropdown>
  );
}
