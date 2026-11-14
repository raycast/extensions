import { List } from "@raycast/api";
import { BARCODE_FORMATS, COMMON_FORMATS } from "../lib/formats";

/**
 * A plain function rather than a component: Raycast renders accessories passed as props,
 * so the element tree has to be List.Dropdown itself.
 */
export function formatDropdown(options: {
  tooltip: string;
  value?: string;
  onChange: (value: string) => void;
  storeValue?: boolean;
}) {
  return (
    <List.Dropdown
      tooltip={options.tooltip}
      value={options.value}
      storeValue={options.storeValue}
      onChange={options.onChange}
    >
      <List.Dropdown.Section title="Most Common">
        {COMMON_FORMATS.map((format) => (
          <List.Dropdown.Item key={format.id} value={format.id} title={format.title} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Barcodes">
        {BARCODE_FORMATS.map((format) => (
          <List.Dropdown.Item key={format.id} value={format.id} title={format.title} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
