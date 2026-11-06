import { List } from "@raycast/api";

export default function ProfileDropdown(props: { profiles: string[]; onSelection: (newValue: string) => void }) {
  return (
    <List.Dropdown
      tooltip="Select Safari profile"
      storeValue={true}
      onChange={(newValue) => {
        props.onSelection(newValue);
      }}
    >
      <List.Dropdown.Section title="Profiles">
        <List.Dropdown.Item key="all" title="All" value="all" />
        {props.profiles.map((profile) => (
          <List.Dropdown.Item key={profile} title={profile} value={profile} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
