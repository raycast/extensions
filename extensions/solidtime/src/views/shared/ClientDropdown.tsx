import { Form } from "@raycast/api";
import { forwardRef } from "react";
import { useClients } from "../../api/hooks.js";
import { useOrgId } from "../../utils/membership.js";

export const ClientDropdown = forwardRef<Form.ItemReference, Form.Dropdown.Props>((props, ref) => {
  const orgId = useOrgId();
  const clients = useClients(orgId);

  return (
    <Form.Dropdown ref={ref} title="Client" isLoading={clients.isLoading} {...props}>
      {clients.data?.map((client) => (
        <Form.Dropdown.Item key={client.id} value={client.id} title={client.name} />
      ))}
    </Form.Dropdown>
  );
});
