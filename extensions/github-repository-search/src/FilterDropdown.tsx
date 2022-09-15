import { Icon, List, Image } from "@raycast/api";
import { useUserData } from "./github";

export function FilterDropdown(props: { onFilterChange: (filter: string) => void }) {
  const { data, error } = useUserData();

  if (error) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Filter Repositories" onChange={props.onFilterChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item title={"All Repositories"} value={""} />
        {data && (
          <List.Dropdown.Item
            title={"My Repositories"}
            value={`user:${data.viewer.login} ${data.viewer.organizations.nodes
              .map((org) => `org:${org.login}`)
              .join(" ")}`}
          />
        )}
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {data && (
          <List.Dropdown.Item
            icon={{ source: data.viewer.avatarUrl ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
            title={data.viewer.login}
            value={`user:${data.viewer.login}`}
          />
        )}
        {data?.viewer.organizations.nodes.map((org) => (
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
