import { Icon, List } from "@raycast/api";

import useDenoState from "@/hooks/useDenoState";
import { useOrganizations } from "@/hooks/useOrganizations";

const OrganizationSwitcher = ({ onTeamChange }: { onTeamChange?: () => void }) => {
  const { organization, otherOrganizations, update } = useOrganizations({ onTeamChange });
  const { user, selectedOrganization } = useDenoState();

  return (
    <List.Dropdown
      value={selectedOrganization || user?.name}
      tooltip="Switch Organization"
      placeholder="Switch organization..."
      onChange={async (newValue) => await update(newValue)}
      isLoading={!user}
    >
      {organization ? (
        <List.Dropdown.Item
          title={
            organization.name ?? (user ? (user.id === organization.id ? `${user?.name} (personal)` : "<unnamed>") : "")
          }
          value={organization.id}
          icon={Icon.TwoPeople}
        />
      ) : null}
      {otherOrganizations.length > 0
        ? otherOrganizations.map((org) => (
            <List.Dropdown.Item
              key={org.id}
              title={org.name ?? (user ? (user.id === org.id ? `${user?.name} (personal)` : "<unnamed>") : "")}
              value={org.id}
              icon={Icon.TwoPeople}
            />
          ))
        : null}
    </List.Dropdown>
  );
};

export default OrganizationSwitcher;
