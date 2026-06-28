import { Action, ActionPanel, Detail, Icon } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { useMemo } from 'react'
import { PROGRAMMING_LANGUAGES_COLORS } from '../constants'
import { formatReadmeMarkdown } from '../lib/readme-markdown'
import { RepoType } from '../type'
import { formatNumber } from '../utils'

export const RepoDetail = ({ repo }: { repo: RepoType }) => {
  const READMEUrl = `https://raw.githubusercontent.com/${repo.author}/${repo.name}/master/README.md`
  const readmeAssetBaseUrl = `https://raw.githubusercontent.com/${repo.author}/${repo.name}/master/`
  const authorUrl = `https://github.com/${repo.author}`
  const languageColor =
    PROGRAMMING_LANGUAGES_COLORS?.[repo.language as keyof typeof PROGRAMMING_LANGUAGES_COLORS] ?? '#fff'
  const githubDevUrl = `https://github.dev/${repo.author}/${repo.name}`
  const repoName = `${repo.author}/${repo.name}`

  const { data: README, isLoading } = useFetch(READMEUrl, { method: 'GET' })
  const markdown = useMemo(
    () => (isLoading ? '' : formatReadmeMarkdown(README, { rawBaseUrl: readmeAssetBaseUrl })),
    [README, isLoading, readmeAssetBaseUrl],
  )

  return (
    <Detail
      navigationTitle={repoName}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Repository" target={repo.href} text={repoName} />
          <Detail.Metadata.Label title="Stars" icon={Icon.Star} text={`${formatNumber(repo.stars)}`} />
          <Detail.Metadata.TagList title="Language">
            <Detail.Metadata.TagList.Item color={languageColor} text={repo.language || 'Unknown'} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Description" text={repo.description || 'No description'} />
          <Detail.Metadata.Link title="Author" target={authorUrl} text={repo.author} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={repo.href} title="Open in Browser" />
          <Action.OpenInBrowser url={authorUrl} title="Open Author in Browser" />
          <Action.OpenInBrowser icon="github-dev.png" url={githubDevUrl} title="Open in GitHub.dev" />
          <Action.CopyToClipboard title="Copy Repository URL" content={repo.href} />
          <Action.CopyToClipboard title="Copy Repository Name" content={repoName} />
        </ActionPanel>
      }
    />
  )
}
