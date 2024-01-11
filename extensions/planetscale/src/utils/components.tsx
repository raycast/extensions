import { useDatabases, useOrganizations } from "./hooks";
import { Form, List } from "@raycast/api";
import { PlanetScaleColor } from "./colors";
import { withPlanetScaleClient } from "./client";
import { forwardRef } from "react";

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

function FormDatabaseDropdownSection({ organization }: { organization: string }) {
  const { databases } = useDatabases({ organization });
  return (
    <Form.Dropdown.Section title={organization}>
      {databases?.map((database) => (
        <Form.Dropdown.Item
          key={database.id}
          icon={{
            source: "database.svg",
            tintColor: PlanetScaleColor.Blue,
          }}
          title={database.name}
          value={`${organization}-${database.name}`}
        />
      ))}
    </Form.Dropdown.Section>
  );
}

export const FormDatabaseDropdown = forwardRef<Form.ItemReference, Form.Dropdown.Props>((props, ref) => {
  const { organizations, organizationsLoading } = useOrganizations();
  return (
    <Form.Dropdown ref={ref} {...props} isLoading={organizationsLoading || props.isLoading}>
      {organizations?.map((organization) => (
        <FormDatabaseDropdownSection key={organization.id} organization={organization.name} />
      ))}
    </Form.Dropdown>
  );
});

/**
 * Makes sure that we have a authenticated PlanetScale client available in the children
 */
export function View({ children }: { children: JSX.Element }) {
  return withPlanetScaleClient(children);
}
