import { List } from "@raycast/api";
import type { ApiClient } from "../api/client";
import { useRepositories } from "../hooks/useRepositories";

const ALL_REPOS = "__all__";

interface Props {
  client: ApiClient;
  value: string | null;
  onChange: (repoId: string | null) => void;
}

export function RepoDropdown({ client, value, onChange }: Props) {
  const { isLoading, data: repos } = useRepositories(client);

  return (
    <List.Dropdown
      tooltip="Filter by repository"
      isLoading={isLoading}
      value={value ?? ALL_REPOS}
      onChange={(next) => onChange(next === ALL_REPOS ? null : next)}
    >
      <List.Dropdown.Item title="All repositories" value={ALL_REPOS} />
      {repos && repos.length > 0 && (
        <List.Dropdown.Section title="Repositories">
          {repos.map((repo) => (
            <List.Dropdown.Item key={repo.id} title={repo.fullName} value={repo.id} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}
