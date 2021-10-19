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
import { parseRepoUrl } from './parseRepoUrl'

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
      {results?.length
        ? results.map((result) => {
            if (!result.package.links.repository) {
              return null
            }
            return <PackageListItem key={result.package.name} result={result} />
          })
        : null}
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
  const { owner, name, type } = parseRepoUrl(pkg.links.repository)

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
          <OpenInBrowserAction
            url={pkg.links.repository}
            title="Open Repository"
          />

          <OpenInBrowserAction
            url={`https://bundlephobia.com/package/${pkg.name}`}
            title="Open Bundlephobia"
            icon={Icon.QuestionMark}
          />

          {type === 'github' && owner && name ? (
            <PushAction
              title="View readme"
              target={<Readme user={owner} repo={name} />}
              icon={Icon.Eye}
            />
          ) : null}

          {pkg.links.homepage !== pkg.links.repository ? (
            <OpenInBrowserAction
              url={pkg.links.homepage}
              title="Open Homepage"
            />
          ) : null}

          {type === 'github' ? (
            <OpenInBrowserAction
              url={pkg.links.repository.replace('github.com', 'github.dev')}
              title="View Code in Github.dev"
              icon={{
                source: {
                  light: 'github-bright.png',
                  dark: 'github-dark.png',
                },
              }}
              shortcut={{ modifiers: ['opt'], key: 'enter' }}
            />
          ) : null}

          {type === 'github' || (type === 'gitlab' && owner && name) ? (
            <OpenInBrowserAction
              url={`https://codesandbox.io/s/${
                type === 'github' ? 'github' : 'gitlab'
              }/${owner}/${name}`}
              title="View in CodeSandbox"
              icon={{
                source: {
                  light: 'codesandbox-bright.png',
                  dark: 'codesandbox-dark.png',
                },
              }}
            />
          ) : null}

          <OpenInBrowserAction
            url={pkg.links.npm}
            title="npm Package Page"
            icon={{
              source: 'command-icon.png',
            }}
          />

          <OpenInBrowserAction
            url={`https://snyk.io/vuln/npm:${pkg.name}`}
            title="Open Snyk Vulnerability Check"
            icon={{
              source: {
                light: 'snyk-bright.png',
                dark: 'snyk-dark.png',
              },
            }}
          />

          <CopyToClipboardAction
            title={`Copy Yarn Install Command`}
            content={`yarn install ${pkg.name}`}
          />

          <CopyToClipboardAction
            title={`Copy npm Install Command`}
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
