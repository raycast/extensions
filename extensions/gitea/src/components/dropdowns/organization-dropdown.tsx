import { useOrganizations } from "../../api";
import { List } from "@raycast/api";

export function OrganizationDropdown({
  value,
  onChange,
  all = false,
}: {
  value: string;
  onChange: (value: string) => void;
  all?: boolean;
}) {
  const { data, isLoading } = useOrganizations();

  if (data && data.length > 0 && value === "" && !all) {
    onChange(data[0].name);
  }

  return (
    <List.Dropdown isLoading={isLoading} tooltip="Select Organization" value={value} onChange={onChange}>
      {all && <List.Dropdown.Item key={0} title="All" value="" />}

      <List.Dropdown.Section title="Organizations">
        {data &&
          data.map((organization) => (
            <List.Dropdown.Item key={organization.id} title={organization.full_name} value={organization.name} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
