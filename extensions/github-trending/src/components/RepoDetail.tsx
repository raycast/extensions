import { Action, ActionPanel, Detail, Icon } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { PROGRAMMING_LANGUAGES_COLORS } from '../constants'
import { RepoType } from '../type'
import { formatNumber } from '../utils'

export const RepoDetail = ({ repo }: { repo: RepoType }) => {
  const READMEUrl = `https://raw.githubusercontent.com/${repo.author}/${repo.name}/master/README.md`
  const authorUrl = `https://github.com/${repo.author}`
  const languageColor =
    PROGRAMMING_LANGUAGES_COLORS?.[repo.language as keyof typeof PROGRAMMING_LANGUAGES_COLORS] ?? '#fff'
  const githubDevUrl = `https://github.dev/${repo.author}/${repo.name}`

  const { data: README, isLoading } = useFetch(READMEUrl, { method: 'GET' })
  return (
    <Detail
      navigationTitle={repo.author + '/' + repo.name}
      isLoading={isLoading}
      markdown={README as string}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Repository" target={repo.href} text={repo.author + '/' + repo.name} />
          <Detail.Metadata.Label title="Stars" icon={Icon.Star} text={`${formatNumber(repo.stars)}`} />
          <Detail.Metadata.TagList title="Language">
            <Detail.Metadata.TagList.Item color={languageColor} text={repo.language} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Description" text={`${repo.description}`} />
          <Detail.Metadata.Link title="Author" target={authorUrl} text={repo.author} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={repo.href} title="Open in Browser" />
          <Action.OpenInBrowser url={authorUrl} title="Open Author in Browser" />
          <Action.OpenInBrowser icon="github-dev.png" url={githubDevUrl} title="Open in GitHub.dev" />
        </ActionPanel>
      }
    />
  )
}
