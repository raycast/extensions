import { NamingStyle } from "./utils";
import { List } from "@raycast/api";

export function StyleDropdown(props: { onStyleChange: (newValue: string) => void }) {
  const { onStyleChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Style"
      storeValue={true}
      onChange={(newValue: string) => {
        onStyleChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Styles">
        {Object.entries(NamingStyle).map(([, v]) => (
          <List.Dropdown.Item key={v} title={v} value={v} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
