import { useDatabases, useOrganizations } from "./hooks";
import { List } from "@raycast/api";

function DatabaseDropdownSection({ organization }: { organization: string }) {
  const { databases } = useDatabases({ organization });
  return (
    <List.Dropdown.Section title={organization}>
      {databases?.map((database) => (
        <List.Dropdown.Item key={database.id} title={database.name} value={`${organization}-${database.name}`} />
      ))}
    </List.Dropdown.Section>
  );
}

export function DatabaseDropdown({
  onChange,
}: {
  onChange: (value: { organization: string; database: string }) => void;
}) {
  const { organizations, organizationsLoading } = useOrganizations();
  return (
    <List.Dropdown
      tooltip="Select Database"
      storeValue
      isLoading={organizationsLoading}
      onChange={(value) => {
        const [organization, database] = value.split("-");
        onChange({ organization, database });
      }}
    >
      {organizations?.map((organization) => (
        <DatabaseDropdownSection key={organization.id} organization={organization.name} />
      ))}
    </List.Dropdown>
  );
}
