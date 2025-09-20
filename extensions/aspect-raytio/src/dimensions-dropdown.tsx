import { List } from "@raycast/api";
import { BasedDimensions } from ".";

export default function DimensionsDropdown(props: {
  value: BasedDimensions;
  handleDimensionChange: (value: BasedDimensions) => void;
}) {
  const { value, handleDimensionChange } = props;

  return (
    <List.Dropdown
      tooltip="Aspect Ratio Based On"
      value={value}
      onChange={(value) => {
        handleDimensionChange(value as BasedDimensions);
      }}
    >
      <List.Dropdown.Section title="Aspect Ratio Based On">
        <List.Dropdown.Item title={BasedDimensions.BASED_WIDTH} value={BasedDimensions.BASED_WIDTH} />
        <List.Dropdown.Item title={BasedDimensions.BASED_HEIGHT} value={BasedDimensions.BASED_HEIGHT} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
