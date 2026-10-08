import { Form, List } from "@raycast/api";

import type { AccountSummary } from "@/lib/accounts";

type Props = { accounts: AccountSummary[]; value: string; onChange: (id: string) => void; form?: boolean };
export default function AccountSelector({ accounts, value, onChange, form }: Props) {
  if (form)
    return (
      <Form.Dropdown id="accountId" title="Account" value={value} onChange={onChange}>
        <Form.Dropdown.Item value="" title="Select an account" />
        {accounts.map((a) => (
          <Form.Dropdown.Item key={a.id} value={a.id} title={`${a.label} (${a.publication})`} />
        ))}
      </Form.Dropdown>
    );
  return (
    <List.Dropdown tooltip="Select a Substack account" value={value} onChange={onChange}>
      <List.Dropdown.Item value="" title="Select an account" />
      {accounts.map((a) => (
        <List.Dropdown.Item key={a.id} value={a.id} title={`${a.label} (${a.publication})`} />
      ))}
    </List.Dropdown>
  );
}
