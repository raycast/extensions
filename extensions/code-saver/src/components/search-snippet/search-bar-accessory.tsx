import { Icon, List } from "@raycast/api";
import { FILTER_ALL, SNIPPETS_FILTER } from "../../lib/types/snippet-filters";
import { labelIcon } from "../../lib/utils/snippet-utils";
import { Label, Library } from "../../lib/types/dto";
import { getAvatarIcon } from "@raycast/utils";

function LabelItem({ label }: { label: Label }) {
  return (
    <List.Dropdown.Item key={label.uuid} title={label.title} value={`label_${label.uuid}`} icon={labelIcon(label)} />
  );
}

function LibraryItem({ library }: { library: Library }) {
  return (
    <List.Dropdown.Item
      key={library.uuid}
      icon={getAvatarIcon(library.name)}
      title={library.name}
      value={`library_${library.uuid}`}
    />
  );
}

interface SearchBarAccessoryProps {
  filter: SNIPPETS_FILTER;
  setFilter: (value: SNIPPETS_FILTER) => void;
  labels: Label[];
  libraries: Library[];
}

export function SearchBarAccessory({ labels, libraries, filter, setFilter }: SearchBarAccessoryProps) {
  return (
    <List.Dropdown tooltip="Filter by Library" value={filter} onChange={(value) => setFilter(value as SNIPPETS_FILTER)}>
      <List.Dropdown.Item title="All Snippets" value={FILTER_ALL} icon={Icon.Code} />
      <List.Dropdown.Section title="Libraries">
        {libraries.map((library) => (
          <LibraryItem library={library} key={library.uuid} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Labels">
        {labels.map((label) => (
          <LabelItem label={label} key={label.uuid} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
