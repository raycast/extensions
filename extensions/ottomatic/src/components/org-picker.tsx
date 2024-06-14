import { List } from "@raycast/api";
import { useJWT } from "../lib/ottomatic";
import { useCachedState } from "@raycast/utils";

export default function useOrgPicker() {
  const { data } = useJWT();
  const [selectedOrg, setSelectedOrg] = useCachedState<string>("selectedOrg", "");
  const membership = data?.memberships.find((membership) => membership.organization.id === selectedOrg);

  const OrgPicker = (
    <List.Dropdown tooltip="Select Organization" value={selectedOrg} onChange={(val) => setSelectedOrg(val)}>
      <List.Dropdown.Item value="" title="All Organizations" />
      {data?.memberships.map((membership) => (
        <List.Dropdown.Item
          value={membership.organization.publicMetadata.org_id.toString()}
          key={membership.id}
          icon={{ source: membership.organization.imageUrl }}
          title={membership.organization.name}
        />
      ))}
    </List.Dropdown>
  );
  return { OrgPicker, selectedOrg, membership };
}
