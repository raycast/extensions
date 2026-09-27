import type { Repository } from './types';
import { getPreferenceValues } from '@raycast/api';

export function sortRepos(repositories: Repository[] = []) {
  const repos = (repositories ?? []).filter(repo => repo.id);
  const { sort } = getPreferenceValues<Preferences.BrowserRepository>();

  if (sort === 'updated_at') {
    return repos.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  return repos.sort((a, b) => b[sort] - a[sort]);
}
