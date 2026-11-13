import { List } from "@raycast/api";
import { getCardTypeIcon } from "../lib/cardIcons";
import type { RaycastCardType } from "../lib/searchFilters";

const ALL_TYPES = "all";

const TYPE_OPTIONS: Array<{ title: string; value: RaycastCardType }> = [
  { title: "Links", value: "link" },
  { title: "Text", value: "text" },
  { title: "Quotes", value: "quote" },
  { title: "Images", value: "image" },
  { title: "Videos", value: "video" },
  { title: "Audio", value: "audio" },
  { title: "Documents", value: "document" },
  { title: "Palettes", value: "palette" },
];

interface CardTypeDropdownProps {
  onChange: (type: RaycastCardType | undefined) => void;
  type?: RaycastCardType;
}

/** Mirrors the search's `type:` qualifier, so typing it and picking a type stay in step. */
export function CardTypeDropdown({ onChange, type }: CardTypeDropdownProps) {
  return (
    <List.Dropdown
      onChange={(value) => {
        const next =
          value === ALL_TYPES ? undefined : (value as RaycastCardType);
        if (next !== type) {
          onChange(next);
        }
      }}
      tooltip="Filter by Type"
      value={type ?? ALL_TYPES}
    >
      <List.Dropdown.Item title="All Types" value={ALL_TYPES} />
      <List.Dropdown.Section>
        {TYPE_OPTIONS.map((option) => (
          <List.Dropdown.Item
            icon={getCardTypeIcon({ type: option.value })}
            key={option.value}
            title={option.title}
            value={option.value}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
