import { List } from "@raycast/api";

type DrinkType = { id: string; name: string };

export const langTypes: DrinkType[] = [
  { id: "en", name: "English" },
  { id: "zh-CN", name: "Chinese" },
];

export const drinkTypes: DrinkType[] = [
  { id: "IPv4", name: "IPv4" },
  { id: "IPv6", name: "IPv6" },
];

export const formatTypes: DrinkType[] = [
  { id: "expanded", name: "expanded" },
  { id: "compressed", name: "compressed" },
];

export function DrinkDropdown(props: { drinkTypes: DrinkType[]; onDrinkTypeChange: (newValue: string) => void }) {
  const { drinkTypes, onDrinkTypeChange } = props;
  return (
    <List.Dropdown storeValue={true} tooltip="Select IP Version" onChange={(newValue) => onDrinkTypeChange(newValue)}>
      <List.Dropdown.Section>
        {drinkTypes.map((drinkType) => (
          <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
