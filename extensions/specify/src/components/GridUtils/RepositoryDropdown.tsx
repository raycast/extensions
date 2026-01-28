import { Grid } from '@raycast/api';
import { Repository } from '../../types/repositories.types';

interface RepoDropdownProps {
  repositories?: Array<Repository>;
  onChange: (repository: Repository) => void;
  isLoading: boolean;
}

export default (props: RepoDropdownProps) => {
  const { repositories, onChange } = props;
  return (
    <Grid.Dropdown
      tooltip="Select Repository"
      storeValue={true}
      onChange={(newValue) => {
        onChange(repositories?.find((repo) => repo.id === newValue) as Repository);
      }}
    >
      <Grid.Dropdown.Section title="Repositories">
        {repositories?.map((repository) => (
          <Grid.Dropdown.Item key={repository.id} title={repository.name} value={repository.id} />
        ))}
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );
};
