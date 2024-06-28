import { Image, List } from "@raycast/api";

import { useMyRepositories } from "../hooks/useRepositories";

type RepositoryDropdownProps = {
  setSelectedRepository: React.Dispatch<React.SetStateAction<string | null>>;
  withAllRepositories?: boolean;
};

export default function RepositoriesDropdown({
  setSelectedRepository,
  withAllRepositories = true,
}: RepositoryDropdownProps) {
  const { data: repositories } = useMyRepositories();

  return (
    <List.Dropdown tooltip="Select Repository" storeValue onChange={setSelectedRepository}>
      {withAllRepositories ? <List.Dropdown.Item value="" title="All Repositories" /> : null}

      {repositories && repositories.length > 0 ? (
        <List.Dropdown.Section>
          {repositories.map((repository) => {
            return (
              <List.Dropdown.Item
                key={repository.id}
                title={repository.nameWithOwner}
                value={repository.nameWithOwner}
                icon={{ source: repository.owner.avatarUrl, mask: Image.Mask.Circle }}
              />
            );
          })}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}
