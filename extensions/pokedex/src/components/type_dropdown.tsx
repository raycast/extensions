import { List } from "@raycast/api";

const types = [
  "Normal",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

export default function TypeDropdown(props: {
  command: string;
  onSelectType: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <List.Dropdown
      tooltip={`${props.command} Type Filter`}
      onChange={props.onSelectType}
    >
      <List.Dropdown.Item
        key="all"
        value="all"
        title="All Types"
        icon="pokeball.svg"
      />
      <List.Dropdown.Section>
        {types.map((type) => {
          return (
            <List.Dropdown.Item
              key={type}
              value={type}
              title={type}
              icon={`types/${type.toLowerCase()}.svg`}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
