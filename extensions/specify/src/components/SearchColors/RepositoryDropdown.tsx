import { List } from '@raycast/api';
import { Repository } from '../../types/repositories.types';

interface RepoDropdownProps {
  repositories?: Array<Repository>;
  onChange: (repository: Repository) => void;
  isLoading: boolean;
}

export default (props: RepoDropdownProps) => {
  const { repositories, onChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Repository"
      storeValue={true}
      onChange={(newValue) => {
        onChange(repositories?.find((repo) => repo.id === newValue) as Repository);
      }}
    >
      <List.Dropdown.Section title="Repositories">
        {repositories?.map((repository) => (
          <List.Dropdown.Item key={repository.id} title={repository.name} value={repository.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
