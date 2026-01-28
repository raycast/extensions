import { Grid, List } from "@raycast/api";

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
  type?: string;
  command: string;
  onSelectType: React.Dispatch<React.SetStateAction<string>>;
}) {
  const DropdownComponent =
    props.type === "grid" ? Grid.Dropdown : List.Dropdown;

  return (
    <DropdownComponent
      tooltip={`${props.command} Type Filter`}
      onChange={props.onSelectType}
    >
      <DropdownComponent.Item
        key="all"
        value="all"
        title="All Types"
        icon="pokeball.svg"
      />
      <DropdownComponent.Section>
        {types.map((type) => {
          return (
            <DropdownComponent.Item
              key={type}
              value={type}
              title={type}
              icon={`types/${type.toLowerCase()}.svg`}
            />
          );
        })}
      </DropdownComponent.Section>
    </DropdownComponent>
  );
}
