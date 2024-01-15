import { Form } from "@raycast/api";
import { PlanetScaleColor } from "../colors";
import { forwardRef } from "react";
import { useOrganizations } from "../hooks/use-organizations";
import { useDatabases } from "../hooks/use-databases";

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
