import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
  Detail,
  Icon,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import fetch from 'node-fetch'
import { FetchResponse, Result } from './npmsResponse.model'
import { fetchReadme } from 'fetch-readme'
import parsedRepoUrl from 'parse-github-url'

export default function PackageList() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const onSearchTextChange = async (text: string) => {
    setLoading(true)
    const response = await fetchPackages(text.replace(/\s/g, '+'))
    setResults(response)
    setLoading(false)
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search npms.io..."
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results?.length ? (
        results.map((result) => {
          if (!result.package.links.repository) {
            return null
          }
          return <PackageListItem key={result.package.name} result={result} />
        })
      ) : (
        <List.Item id="Empty" title="No results" icon={Icon.XmarkCircle} />
      )}
    </List>
  )
}

interface PackageListItemProps {
  result: Result
}
const PackageListItem = ({
  result,
}: PackageListItemProps): JSX.Element | null => {
  const pkg = result.package
  const isGithubRepo = pkg.links.repository.includes('github')
  const parsedRepo = parsedRepoUrl(pkg.links.repository)

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.description}
      icon={Icon.ArrowRight}
      accessoryTitle={`v${pkg.version}`}
      keywords={pkg.keywords}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={pkg.links.repository} title="Repository" />
          <OpenInBrowserAction
            url={`https://bundlephobia.com/package/${pkg.name}`}
            title="Bundlephobia cost"
            icon={Icon.QuestionMark}
          />
          {isGithubRepo && parsedRepo?.owner && parsedRepo?.name ? (
            <PushAction
              title="View readme"
              target={<Readme user={parsedRepo.owner} repo={parsedRepo.name} />}
              icon={Icon.Eye}
            />
          ) : null}
          {pkg.links.homepage !== pkg.links.repository ? (
            <OpenInBrowserAction url={pkg.links.homepage} title="Homepage" />
          ) : null}
          <OpenInBrowserAction url={pkg.links.npm} title="npm" />
          <OpenInBrowserAction
            url={`https://snyk.io/vuln/npm:${pkg.name}`}
            title="Snyk vulnerability check"
          />
          <CopyToClipboardAction
            title={`Copy "yarn install ${pkg.name}"`}
            content={`yarn install ${pkg.name}`}
          />
          <CopyToClipboardAction
            title={`Copy "npm install ${pkg.name}"`}
            content={`npm install ${pkg.name}`}
          />
        </ActionPanel>
      }
    />
  )
}

async function fetchPackages(searchTerm = ''): Promise<Result[]> {
  try {
    const response = await fetch(
      `https://api.npms.io/v2/search?q=${searchTerm}`,
    )
    const json = await response.json()
    return (json as FetchResponse).results as Result[]
  } catch (error) {
    console.error(error)
    showToast(ToastStyle.Failure, 'Could not load articles')
    return Promise.resolve([])
  }
}
interface ReadmeProps {
  user: string
  repo: string
}

const Readme = ({ user, repo }: ReadmeProps): JSX.Element => {
  const [readme, setReadme] = useState<string>('')
  useEffect(() => {
    fetchReadme(user, repo).then((response: string) => setReadme(response))
  }, [])

  return <Detail markdown={readme} />
}
