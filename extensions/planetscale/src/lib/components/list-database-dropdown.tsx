import { List } from "@raycast/api";
import { PlanetScaleColor } from "../colors";
import { useOrganizations } from "../hooks/use-organizations";
import { useDatabases } from "../hooks/use-databases";

function ListDatabaseDropdownSection({ organization }: { organization: string }) {
  const { databases } = useDatabases({ organization });
  return (
    <List.Dropdown.Section title={organization}>
      {databases?.map((database) => (
        <List.Dropdown.Item
          key={database.id}
          icon={{
            source: database.state === "sleeping" ? "database-sleep.svg" : "database.svg",
            tintColor: PlanetScaleColor.Blue,
          }}
          title={database.name}
          value={`${organization}-${database.name}`}
        />
      ))}
    </List.Dropdown.Section>
  );
}

export function ListDatabaseDropdown({
  onChange,
}: {
  onChange: (value: { organization: string; database: string }) => void;
}) {
  const { organizations, organizationsLoading } = useOrganizations();
  return (
    <List.Dropdown
      tooltip="Select Database"
      storeValue
      placeholder="Select database in organizations"
      isLoading={organizationsLoading}
      onChange={(value) => {
        const [organization, database] = value.split("-");
        onChange({ organization, database });
      }}
    >
      {organizations?.map((organization) => (
        <ListDatabaseDropdownSection key={organization.id} organization={organization.name} />
      ))}
    </List.Dropdown>
  );
}
