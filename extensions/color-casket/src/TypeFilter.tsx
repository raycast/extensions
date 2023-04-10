import { getPreferenceValues, List } from "@raycast/api";
import { ColorType } from "./colors/Color";

export default function TypeFilter({ onColorTypeChange }: { onColorTypeChange: (type: ColorType) => void }) {
  const colorTypes = Object.values(ColorType);

  const defaultFormat = getPreferenceValues<{
    format: string;
  }>().format;

  return (
    <List.Dropdown
      tooltip="Select Color Type"
      storeValue={true}
      onChange={(newValue: string) => {
        onColorTypeChange(newValue as ColorType);
      }}
    >
      <List.Dropdown.Section title="Color Type">
        <List.Dropdown.Item title="All" value="All" />
        <List.Dropdown.Item title={defaultFormat} value={defaultFormat} />
        {colorTypes
          .filter((type) => type !== defaultFormat)
          .map((colorType, index) => (
            <List.Dropdown.Item key={index} title={colorType} value={colorType} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
