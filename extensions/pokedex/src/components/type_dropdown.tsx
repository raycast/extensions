import { Grid, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchTypes } from "../api";

export default function TypeDropdown(props: {
  type?: string;
  command: string;
  onSelectType: React.Dispatch<React.SetStateAction<string>>;
}) {
  const DropdownComponent =
    props.type === "grid" ? Grid.Dropdown : List.Dropdown;

  const { data: types, isLoading } = usePromise(fetchTypes);

  return (
    <DropdownComponent
      tooltip={`${props.command} Type Filter`}
      onChange={props.onSelectType}
      isLoading={isLoading}
    >
      <DropdownComponent.Item
        key="all"
        value="all"
        title="All Types"
        icon="pokeball.svg"
      />
      <DropdownComponent.Section>
        {types?.map((type) => {
          return (
            <DropdownComponent.Item
              key={type.name}
              value={type.name}
              title={type.typenames[0]?.name || type.name}
              icon={`types/${type.name.toLowerCase()}.svg`}
            />
          );
        })}
      </DropdownComponent.Section>
    </DropdownComponent>
  );
}
