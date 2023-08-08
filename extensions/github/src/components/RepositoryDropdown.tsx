import { List, Image } from "@raycast/api";
import { useState } from "react";

import { useMyRepositories } from "../hooks/useRepositories";

type RepositoryDropdownProps = {
  setSelectedRepository: React.Dispatch<React.SetStateAction<string | null>>;
  withAllRepositories?: boolean;
};

export default function RepositoriesDropdown({
  setSelectedRepository,
  withAllRepositories = true,
}: RepositoryDropdownProps) {
  const [searchText, setSearchText] = useState("");
  const { data: repositories, isLoading } = useMyRepositories(searchText);

  return (
    <List.Dropdown
      tooltip="Select Repository"
      storeValue
      onChange={setSelectedRepository}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
    >
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
