import { Grid, List } from "@raycast/api";

const alliances = ["Star Alliance", "SkyTeam", "oneworld", "Vanilla Alliance"];

export default function SearchBar(props: {
  type: string;
  selected: string;
  onSelect: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { type, selected, onSelect } = props;

  const Component = type === "grid" ? Grid : List;

  return (
    <Component.Dropdown tooltip="Filter by Alliance" storeValue value={selected} onChange={onSelect}>
      <Component.Dropdown.Item title="All Airlines" value="All" />
      <Component.Dropdown.Section title="Alliances">
        {alliances.map((alliance) => (
          <Component.Dropdown.Item key={alliance} title={alliance} value={alliance} />
        ))}
      </Component.Dropdown.Section>
    </Component.Dropdown>
  );
}
