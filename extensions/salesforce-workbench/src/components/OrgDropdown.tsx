import { Form, List } from "@raycast/api";
import { SalesforceOrg } from "../types";

export function OrgFormDropdown({
  orgs,
  value,
  onChange,
}: {
  orgs: SalesforceOrg[];
  value?: string;
  onChange: (orgId: string) => void;
}) {
  return (
    <Form.Dropdown id="orgId" title="Salesforce Org" value={value ?? ""} onChange={onChange}>
      {!value ? <Form.Dropdown.Item value="" title="Loading Salesforce orgs…" /> : null}
      {orgs.map((org) => (
        <Form.Dropdown.Item
          key={org.orgId}
          value={org.orgId}
          title={`${org.isSandbox ? "Sandbox" : "PRODUCTION"} — ${org.alias}`}
        />
      ))}
    </Form.Dropdown>
  );
}

export function OrgListDropdown({
  orgs,
  value,
  onChange,
}: {
  orgs: SalesforceOrg[];
  value?: string;
  onChange: (orgId: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Choose Salesforce org" value={value ?? ""} onChange={onChange}>
      {!value ? <List.Dropdown.Item value="" title="Loading Salesforce orgs…" /> : null}
      {orgs.map((org) => (
        <List.Dropdown.Item
          key={org.orgId}
          value={org.orgId}
          title={`${org.isSandbox ? "Sandbox" : "PRODUCTION"} — ${org.alias}`}
        />
      ))}
    </List.Dropdown>
  );
}
