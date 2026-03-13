import { List } from "@raycast/api";
import { useMemberships } from "../../api/hooks.js";
import { useMembership } from "../../utils/membership.js";

export default function MembershipAccessory() {
  const ctx = useMembership();
  const memberships = useMemberships();

  return (
    <List.Dropdown
      tooltip="Organization"
      value={ctx.membership?.id}
      isLoading={memberships.isLoading}
      onChange={(id) => {
        const membership = memberships.data?.find((m) => m.id === id);
        if (membership) ctx.setMembership(membership);
      }}
    >
      {memberships.data && (
        <List.Dropdown.Section title="Organization">
          {memberships.data.map((membership) => (
            <List.Dropdown.Item key={membership.id} title={membership.organization.name} value={membership.id} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}
