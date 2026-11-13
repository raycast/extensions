import { Icon, Image, List } from "@raycast/api";

import { buildOwnerSearchFilter } from "../helpers/repository-filter";
import { useViewer } from "../hooks/useViewer";

export default function SearchRepositoryDropdown(props: { onFilterChange: (filter: string) => void }) {
  const viewer = useViewer();
  const organizations = viewer?.organizations?.nodes?.filter((org) => org != null) ?? [];
  const organizationLogins = organizations.map((org) => org.login);
  const hasMultipleOrganizations = organizations.length > 1;

  return (
    <List.Dropdown tooltip="Filter Repositories" onChange={props.onFilterChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item title={"All Repositories"} icon={Icon.List} value={""} />
        {viewer && organizations.length > 0 ? (
          <List.Dropdown.Item
            title={"My Repositories"}
            icon={Icon.Person}
            value={buildOwnerSearchFilter({ userLogin: viewer.login, orgLogins: organizationLogins })}
          />
        ) : null}
        {hasMultipleOrganizations ? (
          <List.Dropdown.Item
            title={"My Organizations"}
            icon={Icon.Building}
            value={buildOwnerSearchFilter({ orgLogins: organizationLogins })}
          />
        ) : null}
      </List.Dropdown.Section>

      <List.Dropdown.Section>
        {viewer ? (
          <List.Dropdown.Item
            icon={{ source: viewer.avatarUrl ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            title={viewer.login}
            value={`user:${viewer.login}`}
          />
        ) : null}

        {organizations.map((org) => (
          <List.Dropdown.Item
            icon={{ source: org.avatarUrl ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            key={org.login}
            title={org.login}
            value={`org:${org.login}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
