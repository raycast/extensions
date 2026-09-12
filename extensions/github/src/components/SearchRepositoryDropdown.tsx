import { Icon, Image, List } from "@raycast/api";

import { useViewer } from "../hooks/useViewer";

export default function SearchRepositoryDropdown(props: { onFilterChange: (filter: string) => void }) {
  const viewer = useViewer();
  const organizations = viewer?.organizations?.nodes?.filter((org) => org != null) ?? [];
  const hasMultipleOrganizations = organizations.length > 1;

  return (
    <List.Dropdown tooltip="Filter Repositories" onChange={props.onFilterChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item title={"All Repositories"} icon={Icon.List} value={""} />
        {hasMultipleOrganizations ? (
          <List.Dropdown.Item
            title={"My Organizations"}
            icon={Icon.Building}
            value={organizations.map((org) => `org:${org.login}`).join(" ")}
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
