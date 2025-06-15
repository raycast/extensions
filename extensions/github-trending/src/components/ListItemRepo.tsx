import { List } from '@raycast/api'
import { PROGRAMMING_LANGUAGES_COLORS } from '../constants'
import { RepoType } from '../type'
import { formatNumber } from '../utils'
import { ActionLanguage } from './ActionLanguage'

export type ListItemProps = {
  repo: RepoType
  onRangeChange: (range: string) => void
}

export const ListItemRepo = ({ repo, onRangeChange }: ListItemProps) => {
  const languageColor =
    PROGRAMMING_LANGUAGES_COLORS?.[repo.language as keyof typeof PROGRAMMING_LANGUAGES_COLORS] ?? '#fff'

  return (
    <List.Item
      title={repo.author + '/' + repo.name}
      subtitle={{
        value: `  ☆ ${formatNumber(repo.stars)} - ${repo.description}`,
        tooltip: repo.description,
      }}
      accessories={[{ tag: { value: repo.language || 'Unknown', color: languageColor } }]}
      actions={<ActionLanguage repo={repo} onChangeRange={onRangeChange} />}
    />
  )
}
