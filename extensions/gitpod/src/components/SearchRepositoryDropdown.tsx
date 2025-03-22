import { Icon, List, Image } from "@raycast/api";

import { useViewer } from "../hooks/useViewer";

export default function SearchRepositoryDropdown(props: { onFilterChange: (filter: string) => void }) {
  const viewer = useViewer();

  return (
    <List.Dropdown tooltip="Filter Repositories" onChange={props.onFilterChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item title={"All Repositories"} value={""} />
        {viewer ? (
          <List.Dropdown.Item
            title={"My Repositories"}
            value={`user:${viewer.login} ${viewer.organizations?.nodes?.map((org) => `org:${org?.login}`).join(" ")}`}
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

        {viewer?.organizations?.nodes?.map((org) => {
          if (!org) {
            return null;
          }

          return (
            <List.Dropdown.Item
              icon={{ source: org.avatarUrl ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
              key={org.login}
              title={org.login}
              value={`org:${org.login}`}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
